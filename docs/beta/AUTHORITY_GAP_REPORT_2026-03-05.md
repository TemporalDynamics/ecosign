# Authority Gap Report - 2026-03-05

## Scope
- Source of truth reviewed: `docs/decisions/DECISION_LOG_3.0.md`.
- History reviewed: last 100 commits from `2026-03-04` back to `2026-02-25` (plus origin commits that created runtime wrappers in late January).
- Runtime validation: local Supabase RPC/Edge calls with anon key + DB privilege checks.

## Execution Status (2026-03-05)
- P0-1 implemented:
  - New migration `supabase/migrations/20260305103000_harden_internal_runtime_surfaces.sql` revokes internal RPC execute from `PUBLIC/anon/authenticated` and grants only `service_role/postgres`.
- P0-2 implemented:
  - Same migration enables RLS on `executor_jobs`, revokes anon/authenticated table privileges, and adds service-only policy.
- P0-3 implemented:
  - Added `requireInternalAuth` to:
    - `supabase/functions/signnow-webhook/index.ts`
    - `supabase/functions/process-signer-signed/index.ts`
    - `supabase/functions/new-document-canonical-trigger/index.ts`
- P0-4 implemented:
  - `signnow-webhook` now accepts only:
    - internal auth (`service_role`/`cron_secret`), or
    - valid HMAC signature header (`x-signature`/`x-signnow-signature`/`x-webhook-signature`) using `SIGNNOW_WEBHOOK_SECRET`.
- P1-1 implemented:
  - New migration `supabase/migrations/20260305113000_project_signature_workflow_status_from_events.sql` centralizes `signature_workflows.status` projection behind `project_signature_workflow_status()` + trigger on `workflow_events`.
- P1-2 implemented:
  - Removed direct `signature_workflows.status` writes from:
    - `apply-signer-signature`
    - `cancel-workflow`
    - `reject-signature`
    - `request-document-changes`
    - `respond-to-changes`
    - `signnow`
    - `signnow-webhook`
  - These paths now emit canonical events and rely on projection.
- P1-3 implemented:
  - Added guard test `tests/authority/workflow_status_authority_guard.test.ts` to fail on direct status writes in critical handlers.
- P1-4 implemented:
  - New migration `supabase/migrations/20260305123000_harden_workflow_events_authority_surface.sql` closes workflow event injection surface:
    - `append_event_to_workflow_events` execute revoked from `PUBLIC/anon/authenticated`,
    - `workflow_events` INSERT policy restricted to `service_role`,
    - direct DML on `workflow_events` revoked from `anon/authenticated`,
    - `claim_execution_jobs` and `claim_executor_jobs` revoked from `PUBLIC/anon/authenticated`.
- P1-5 implemented:
  - New migration `supabase/migrations/20260305133000_close_remaining_internal_mutator_exec_grants.sql` revokes `PUBLIC/anon/authenticated` execute and keeps only `service_role/postgres` for:
    - `reclaim_stale_jobs`
    - `update_job_heartbeat`
    - `anchor_atomic_tx`
    - `anchor_polygon_atomic_tx`
    - `detect_and_recover_orphan_anchors`
    - `project_document_entity_to_user_document`
    - `claim_anchor_batch`
- P1-6 implemented:
  - New migration `supabase/migrations/20260305143000_harden_user_folder_rpc_grants.sql` hardens user-owned folder RPCs:
    - revokes `PUBLIC/anon`,
    - grants `authenticated/service_role/postgres`,
    - covers `create_document_folder`, `rename_document_folder`, `delete_document_folder`, `move_documents_to_folder`, `request_certificate_regeneration`.
- P1-7 implemented:
  - New migration `supabase/migrations/20260305150000_close_internal_security_definer_exec_grants.sql` closes remaining internal helpers detected as `SECURITY DEFINER` + `anon EXECUTE`:
    - `check_and_expire_shares`
    - `claim_signer_for_signing`
    - `expire_signer_links`
    - `handle_new_user`
    - `notify_creator_on_signature`
    - `notify_signature_completed`
    - `notify_signer_link`
    - `notify_workflow_completed`
    - `project_events_to_user_document`
    - `queue_system_welcome_email`
    - `queue_welcome_email`
    - `release_signer_signing_lock`
    - `release_workflow_signing_lock`
    - `trigger_blockchain_anchoring`
    - `worker_heartbeat`
- P1-8 implemented:
  - New migration `supabase/migrations/20260305153000_close_residual_anon_security_definer_grants.sql` closes residual mutators still executable by `anon`:
    - `insert_workflow_signer`
    - `log_ecox_event`
    - `upgrade_protection_level`
- Verification snapshot (2026-03-05):
  - Local DB privilege checks confirm targeted functions are closed for `anon` and aligned with intended role model.
  - Remote migration history confirms `20260305133000`, `20260305143000`, `20260305150000`, and `20260305153000` applied.

## 1) Target vs Actual (Invariants)

### Invariant A - Decision Engine is the only authority for workflow/document decisions
- Target:
  - `protectDocumentV2PipelineDecision` is the only authority for TSA/anchor enqueueing (`docs/decisions/DECISION_LOG_3.0.md:3107`).
- Actual:
  - Protection pipeline authority is mostly centralized in `fase1-executor` (`supabase/functions/fase1-executor/index.ts:260`).
  - But workflow state authority is fragmented across many endpoints.
- Gap:
  - `signature_workflows` has multiple writers outside a single authority path.
- Evidence (writers):
  - `supabase/functions/apply-signer-signature/index.ts:1774`
  - `supabase/functions/cancel-workflow/index.ts:75`
  - `supabase/functions/reject-signature/index.ts:162`
  - `supabase/functions/request-document-changes/index.ts:169`
  - `supabase/functions/respond-to-changes/index.ts:172`
  - `supabase/functions/signnow/index.ts:595`
  - `supabase/functions/signnow-webhook/index.ts:165`

### Invariant B - Executors execute effects, not business decisions
- Target:
  - Orchestrator only executes jobs (`supabase/functions/orchestrator/index.ts:469`).
- Actual:
  - Orchestrator itself is aligned.
  - Decision-like behavior still exists in workflow endpoints (terminal completion and policy selection) before executor phase.
- Gap:
  - Business closure logic still lives in endpoint code paths (`apply-signer-signature`) and mutates workflow state directly.

### Invariant C - `document_entities.events[]` is canonical ledger
- Target:
  - Canonical append-only ledger + envelope enforced (`docs/beta/DOCUMENT_AUTHORITY_LAYER_SEALED.md:12`, `supabase/migrations/20260301001200_anchor_concurrency_idempotence_hardening.sql:152`).
- Actual:
  - Canonical append path exists and is used by helper (`supabase/functions/_shared/eventHelper.ts:174`).
  - But append RPC is callable by public roles in runtime DB state.
- Gap:
  - Canonical ledger writer function is exposed in practice (privilege drift).

### Invariant D - No internal endpoint should be publicly callable
- Target:
  - Internal workers must require internal auth.
- Actual:
  - Protected correctly:
    - `supabase/functions/orchestrator/index.ts:525`
    - `supabase/functions/fase1-executor/index.ts:474`
  - Not protected:
    - `supabase/functions/signnow-webhook/index.ts:112`
    - `supabase/functions/process-signer-signed/index.ts:19`
    - `supabase/functions/new-document-canonical-trigger/index.ts:79`
- Gap:
  - Internal/public boundary drifted. The auth-surface doc still classifies many internals as public (`docs/beta/AUTH_SURFACE_SEALED.md:125`).

### Invariant E - No job should mutate state outside the defined pipeline
- Target:
  - Runtime SQL/cron wrappers should only be internal triggers.
- Actual:
  - Internal RPC wrappers are callable by anon/authenticated in current DB permissions.
- Gap:
  - External caller can trigger runtime effects (`runtime_tick`, `wake_execution_engine`, `process_orchestrator_jobs`, claims).
- Evidence (migration grants that introduced this):
  - `supabase/migrations/20260129130000_orchestrator_claim_function.sql:48`
  - `supabase/migrations/20260129120100_final_wake_execution_engine.sql:47`
  - `supabase/migrations/20260127010000_orchestrator_processing_function.sql:53`
- Evidence (runtime checks 2026-03-05 local):
  - `POST /rest/v1/rpc/runtime_tick` => `204` (anon)
  - `POST /rest/v1/rpc/claim_initial_decision_jobs` => returns claimed jobs (anon)

## 2) P0 Fixes (Immediate)

### P0-1: Close internal RPC execution grants
- Revoke execute from `PUBLIC`, `anon`, `authenticated` for:
  - `runtime_tick`
  - `wake_execution_engine`
  - `process_orchestrator_jobs`
  - `claim_orchestrator_jobs`
  - `claim_initial_decision_jobs`
  - `append_document_entity_event`
- Grant only to `service_role` and `postgres`.

### P0-2: Close runtime queue table surface
- `executor_jobs` currently has no RLS and anon has table privileges in local runtime.
- Enable RLS + service-only policy.
- Revoke direct `SELECT/INSERT/UPDATE/DELETE` from `anon` and `authenticated`.

### P0-3: Close public callable internal workers
- Add `requireInternalAuth` to:
  - `signnow-webhook` (or strict webhook signature validation, see P0-4)
  - `process-signer-signed`
  - `new-document-canonical-trigger`
- Update auth surface docs/tests to match real boundary (no more "internal as public").

### P0-4: Enforce webhook authenticity
- `signnow-webhook` must verify provider signature/secret before processing payload.
- Reject unsigned/invalid requests with 401/403 before any workflow lookup/update.

## 3) Minimal Diff Plan (Files)

### A. New SQL hardening migration
- File to add:
  - `supabase/migrations/20260305103000_harden_internal_runtime_surfaces.sql`
- Minimal content:
  - Revoke/Grant function execution for internal runtime RPCs (P0-1).
  - Enable RLS and add service-only policies for `executor_jobs` (P0-2).
  - Revoke table DML privileges from `anon/authenticated` on `executor_jobs`.

### B. Internal auth/webhook checks
- File changes:
  - `supabase/functions/signnow-webhook/index.ts`
  - `supabase/functions/process-signer-signed/index.ts`
  - `supabase/functions/new-document-canonical-trigger/index.ts`
- Minimal content:
  - Add early auth guard (`requireInternalAuth`) for internal-only handlers.
  - For `signnow-webhook`, add explicit signature verification path.

### C. Contract + guard alignment
- File changes:
  - `docs/beta/AUTH_SURFACE_SEALED.md`
  - `tests/authority/auth_surface_sealed_guard.test.ts`
- Minimal content:
  - Move internal workers out of `publicNoAuth` category.
  - Add guard assertions that these endpoints require internal auth.

### D. Authority centralization (status projection)
- File changes (phase 2 after P0):
  - `supabase/functions/apply-signer-signature/index.ts`
  - `supabase/functions/cancel-workflow/index.ts`
  - `supabase/functions/reject-signature/index.ts`
  - `supabase/functions/request-document-changes/index.ts`
  - `supabase/functions/respond-to-changes/index.ts`
  - `supabase/functions/signnow/index.ts`
  - `supabase/functions/signnow-webhook/index.ts`
- Minimal direction:
  - stop direct `signature_workflows.status` authority updates,
  - emit canonical events,
  - project status from a single projector path.

## Root Cause (Why cycle repeats)
- High-change hotspot: `apply-signer-signature` was touched 59 times in last 100 commits.
- Boundary rules were partially encoded in docs/tests, but DB grants and endpoint auth were not sealed with hard runtime gates.
- Temporary compatibility decisions became durable behavior (especially in auth surface and SQL grants).

## Confidence
- High confidence on security/runtime exposure findings (validated with local DB privilege queries and live anon calls).
- Medium-high confidence on authority fragmentation (confirmed by current writer map and commit history).
