# EcoSign Authority Map (Real vs Target) - 2026-03-05

## Scope
- Repository sweep over:
  - `supabase/functions/*`
  - `supabase/migrations/*`
  - runtime SQL state (local Supabase DB)
- Focus:
  - authority
  - security surfaces
  - runtime loops
  - technical debt with operational risk

---

## Target Authority (Contract)

1. Decision authority lives in one place:
   - Decision Engine / canonical rules (`packages/authority` + canonical event pipeline).
2. Executors execute effects only:
   - no business-state decisions.
3. Canonical ledger:
   - `document_entities.events[]` is append-only canonical.
4. `documents` and `user_documents` are projections:
   - never authority.
5. Worker idempotency:
   - every worker path must be safe under retries / duplicate delivery.
6. Internal surfaces:
   - never publicly invocable.
7. `signature_workflows.status`:
   - projection only (not business authority).

---

## Real Authority Map (Current)

## Table Writer Map

| table | writers (runtime) | source files |
| --- | --- | --- |
| `document_entities.events[]` | canonical append RPC (`append_document_entity_event`) via helper | `supabase/functions/_shared/eventHelper.ts:174`, `supabase/migrations/20260301001200_anchor_concurrency_idempotence_hardening.sql:152` |
| `document_entities` (non-events fields) | direct updates for witness/custody metadata | `supabase/functions/apply-signer-signature/index.ts:1041`, `supabase/functions/record-protection-event/index.ts:133`, `supabase/functions/register-custody-upload/index.ts:151`, `supabase/functions/store-encrypted-custody/index.ts:170` |
| `workflow_events` | helper-based inserts + some direct inserts | `supabase/functions/_shared/canonicalEventHelper.ts:60`, `supabase/functions/apply-signer-signature/index.ts:1565`, `supabase/functions/build-final-artifact/index.ts:200` |
| `signature_workflows.status` | SQL projection from workflow events | `supabase/migrations/20260305113000_project_signature_workflow_status_from_events.sql:4`, `supabase/migrations/20260305113000_project_signature_workflow_status_from_events.sql:154` |
| `signature_workflows` (non-status) | workflow creation + hash/path/signnow metadata updates | `supabase/functions/start-signature-workflow/index.ts:287`, `supabase/functions/apply-signer-signature/index.ts:1010`, `supabase/functions/process-signer-signed/index.ts:206`, `supabase/functions/signnow/index.ts:595`, `supabase/functions/signnow-webhook/index.ts:226` |
| `executor_jobs` | enqueue from SQL listener trigger, state transitions by runtime workers | `supabase/migrations/20260224163000_canonicalize_listener_dedupe_and_signature_evidence.sql:73`, `supabase/functions/fase1-executor/index.ts:558`, `supabase/functions/orchestrator/index.ts:383` |
| `user_documents` (projection) | SQL projector + legacy atomic tx helpers | `supabase/migrations/20260303120000_fix_projection_insert_and_eco_path.sql:98`, `supabase/migrations/20251208090000_anchor_atomic_tx.sql:57`, `supabase/migrations/20251213000000_polygon_atomic_tx.sql:54` |

## Worker Map (Trigger -> Inputs -> Outputs -> Side Effects)

| worker | trigger | inputs | outputs | side effects |
| --- | --- | --- | --- | --- |
| `runtime_tick()` | cron `runtime-tick` every 1 min | none | HTTP calls to `fase1-executor`, `orchestrator` | can reclaim stale jobs + wake runtime | 
| `fase1-executor` | internal call from `runtime_tick` / internal wake | claimed decision jobs | `job.*.required` canonical events | updates `executor_jobs` status to `succeeded/failed` |
| `process_document_entity_events` (SQL trigger) | `document_entities` events append | last canonical event | queued jobs in `executor_jobs` with dedupe | drives full decision->execution loop |
| `orchestrator` | internal call from `runtime_tick` | claimed execution jobs | invokes effect workers (`run-tsa`, `submit-anchor-*`, `build-artifact`, `generate-signature-evidence`) | heartbeat + retry/dead-letter on `executor_jobs` |
| `signnow-webhook` | external webhook + HMAC/internal auth | provider payload | `workflow.completed` canonical event | updates signnow metadata/path/hash; projects workflow status |
| `apply-signer-signature` | external signer endpoint | signer token + signature payload | `signer.signed`, `signature.completed`, `workflow.completed` (if last signer) | updates signer state/hash fields; wakes execution engine |

---

## Security Surface Map

| surface | auth (current) | risk | exploit path | status |
| --- | --- | --- | --- | --- |
| `runtime_tick`, `wake_execution_engine`, `process_orchestrator_jobs`, `claim_orchestrator_jobs`, `claim_initial_decision_jobs` | service-role only | runtime abuse if public | `/rest/v1/rpc/<fn>` | sealed in `supabase/migrations/20260305103000_harden_internal_runtime_surfaces.sql` |
| `append_document_entity_event` | service-role only | canonical ledger corruption if public | `/rest/v1/rpc/append_document_entity_event` | sealed in `supabase/migrations/20260305103000_harden_internal_runtime_surfaces.sql` |
| `append_event_to_workflow_events` | service-role only | workflow event injection -> status projection tampering | `/rest/v1/rpc/append_event_to_workflow_events` | sealed in `supabase/migrations/20260305123000_harden_workflow_events_authority_surface.sql` |
| `reclaim_stale_jobs` | SECURITY DEFINER + anon executable | external caller can requeue/dead-letter runtime jobs | `/rest/v1/rpc/reclaim_stale_jobs` | **open** |
| `update_job_heartbeat` | SECURITY DEFINER + anon executable | external caller can keep/perturb running jobs | `/rest/v1/rpc/update_job_heartbeat` | **open** |
| `anchor_atomic_tx`, `anchor_polygon_atomic_tx` | SECURITY DEFINER + anon executable | mutates `anchors` + `user_documents` bypassing normal flow | `/rest/v1/rpc/anchor_atomic_tx` | **open** |
| `detect_and_recover_orphan_anchors` | SECURITY DEFINER + anon executable | forces outbound anchor jobs using vault secret | `/rest/v1/rpc/detect_and_recover_orphan_anchors` | **open** |

---

## Findings (Severity)

## CRITICAL

1) Runtime mutation RPCs still externally executable (`reclaim_stale_jobs`, `update_job_heartbeat`)
- File: `supabase/migrations/20260131000100_reclaim_stale_jobs_function.sql:5`, `supabase/migrations/20260131000200_update_job_heartbeat_function.sql:6`
- Description: both functions are `SECURITY DEFINER`; current SQL privileges allow anon execution.
- Impact: attacker can manipulate runtime queue health (`executor_jobs`) and alter retry/dead-letter behavior.
- Suggested fix: explicit `REVOKE EXECUTE FROM PUBLIC/anon/authenticated` + `GRANT EXECUTE TO service_role/postgres` in a new hardening migration.

2) Legacy atomic anchoring RPCs externally executable (`anchor_atomic_tx`, `anchor_polygon_atomic_tx`)
- File: `supabase/migrations/20251208090000_anchor_atomic_tx.sql:16`, `supabase/migrations/20251213000000_polygon_atomic_tx.sql:5`
- Description: both are `SECURITY DEFINER` and mutate `anchors`/`user_documents`; they remain callable via RPC.
- Impact: forged confirmation paths or projection drift outside canonical pipeline.
- Suggested fix: revoke public execute; keep service-role only; deprecate/remove legacy callers.

## HIGH

3) Orphan recovery function publicly executable
- File: `supabase/migrations/20260118050000_fix_orphan_recovery_auth.sql:9`
- Description: `detect_and_recover_orphan_anchors()` can trigger outbound anchor workers with vault credentials.
- Impact: external trigger can induce expensive background load and side effects.
- Suggested fix: revoke public execute and allow only cron/service-role caller.

4) Projection function publicly executable
- File: `supabase/migrations/20260303120000_fix_projection_insert_and_eco_path.sql:6`
- Description: `project_document_entity_to_user_document()` is `SECURITY DEFINER` and updates/inserts projection rows.
- Impact: projection integrity/noise can be externally perturbed.
- Suggested fix: service-role only execute; invoke strictly from trigger path.

5) Decision authority still distributed in endpoint code (implicit authority)
- File: `supabase/functions/apply-signer-signature/index.ts:260`, `supabase/functions/respond-to-changes/index.ts:147`, `supabase/functions/reject-signature/index.ts:158`, `supabase/functions/signnow/index.ts:608`
- Description: business transitions are still inferred/emitted in multiple handlers; `packages/authority` decisions are not imported by runtime handlers.
- Impact: architecture drift and recurrence of authority fragmentation cycles.
- Suggested fix: route workflow transition decisions through one authority adapter (single decision module/RPC) and keep handlers as IO adapters.

## MEDIUM

6) Direct `workflow_events` insert paths bypass canonical helper
- File: `supabase/functions/apply-signer-signature/index.ts:1565`, `supabase/functions/build-final-artifact/index.ts:200`
- Description: some writers bypass `canonicalEventHelper` validation envelope.
- Impact: inconsistent event-shape/idempotency behavior across handlers.
- Suggested fix: converge all workflow event writes through `supabase/functions/_shared/canonicalEventHelper.ts`.

7) Workflow bootstrap does not emit canonical `workflow.created`/`workflow.activated`
- File: `supabase/functions/start-signature-workflow/index.ts:270`
- Description: workflow starts with `status='active'` on insert, without canonical lifecycle event.
- Impact: reduced replay/audit fidelity for initial transition.
- Suggested fix: append lifecycle events atomically after creation, then rely on projector.

## LOW

8) Disabled legacy endpoint remains in tree
- File: `supabase/functions/store-signer-signature/index.ts:35`
- Description: function hard-fails immediately (`throw new Error('Legacy path disabled...')`) but still exists.
- Impact: operational confusion and accidental reactivation risk.
- Suggested fix: remove endpoint and related config/tests.

## INFO

9) P1 authority centralization was applied
- File: `supabase/migrations/20260305113000_project_signature_workflow_status_from_events.sql:4`
- Description: `signature_workflows.status` now projects from `workflow_events` via trigger.
- Impact: closes multi-writer status authority drift from endpoint updates.
- Suggested fix: keep guard test active (`tests/authority/workflow_status_authority_guard.test.ts`).

10) Workflow-events authority hardening was applied
- File: `supabase/migrations/20260305123000_harden_workflow_events_authority_surface.sql:6`
- Description: closed `append_event_to_workflow_events` + restricted `workflow_events` INSERT policy/table DML to service-role.
- Impact: closes direct external workflow event injection vector.
- Suggested fix: replicate hardening pattern for remaining SECURITY DEFINER runtime mutators (critical items above).
