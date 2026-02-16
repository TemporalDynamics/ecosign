# Canonical Architecture Contract

Date: 2026-02-16
Status: Active
Scope: Canonical convergence phases 5-7

## 1) Decision Authority

Component: `supabase/functions/fase1-executor`

- Reads only canonical ledger state from `document_entities.events[]`.
- Delegates next-step decisions to pure decision functions.
- Emits operational events (`job.*.required`) that request execution.
- Must not execute business side-effects directly.
- Must not read legacy tables to decide what follows.

## 2) Execution Engine

Components: DB listener + queue runners

- Listens for `job.*.required` events.
- Maps events to `executor_jobs` entries in a mechanical 1:1 way.
- Claims and executes queued jobs.
- Must not reinterpret business policy.
- Must not branch decisions based on plan/flags/time.

## 3) Workers

Components: edge job handlers (`run-tsa`, `submit-anchor-*`, `build-artifact`, etc.)

- Execute external effects only.
- Emit canonical result events (`tsa.confirmed`, `anchor.confirmed`, `artifact.finalized`, etc.).
- Must not create follow-up business jobs directly.
- Must not become a second decision authority.

## 4) Canonical Invariants

- No pipeline progression without a new event.
- Same `events[]` must produce the same decision result.
- `document_entities.events[]` is the canonical ledger.
- Projections (`anchors`, `user_documents`, caches) are operational and non-authoritative for decisioning.

## 5) Readiness Conditions

- Canonical readiness gate passes (`13/13`).
- Decision path contains no external policy parameters.
- Decision path contains no legacy fallback logic affecting next-step decisions.
- Canonical-only proof is executable in staging.
