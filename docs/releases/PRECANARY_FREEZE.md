# Pre-Canary Freeze Snapshot

- Freeze date: 2026-02-14
- Freeze branch baseline: `main`
- Baseline commit at freeze start: `80f8116`
- Freeze decision log updated: `docs/decisions/DECISION_LOG_3.0.md`

## Scope Locked
- EPI witness policy: fail-hard, immutable `signed/...` only.
- Workflow model: CLOSED (terminal workflows are not reopened).
- Share OTP path resolution hardened for signed/legacy documents.
- Signer flow completion UI constrained to downloads only (no owner documents navigation).

## Verification Artifacts
- `docs/releases/artifacts/2026-02-14-precanary-freeze/verify_epi_invariants.out`
- `docs/releases/artifacts/2026-02-14-precanary-freeze/verify_precanary_epi.sql`
- `docs/releases/artifacts/2026-02-14-precanary-freeze/verify_precanary_epi.out`
- `artifacts/event_map.local.json`
- `artifacts/event_audit.json`

## Verification Status
- `verify_epi_invariants.sh`: **PASSED** (`violations.non_signed_witness_path=0`, `violations.completed_without_immutable_witness=0`).
- `verify_precanary_epi.sql`: executed with no violation rows.
- Extra integrity checks:
  - Event monotonicity: no rows returned.
  - Canonical pointer uniqueness (`signed/*`): no rows returned.
  - `executor_jobs` correlation consistency (`entity_id == correlation_id`): no rows returned.
- Root build (`npm run build`): **PASSED** (eco-packer + client).
- Event audit (`npm run audit:events`): **OK** after pragmatic hardening of false-positive filters.

## Deploy State (reported)
- Edge Functions deploy: completed (no-change deploy accepted by CLI).
- DB push: reported up-to-date in earlier run; migration history mismatch warning later references legacy file naming (`20260213`).

## Known Non-Blocking Risk
- `executor_jobs` has `dead` entries for `generate_signature_evidence` with `last_error=document_entity not found`.
- Classified as non-blocking for current canary scope (optional/derived evidence layer, not canonical witness integrity).

## Canary Gate (Required Before Go)
- Re-run SQL invariant checks on target environment and store outputs.
- Confirm no 404/object-not-found in preview/download for protect, signer flow, and Mi Firma.
- Confirm Share OTP green on protect/workflow/Mi Firma for canonical witness artifact.
- Monitor dead jobs trend for `generate_signature_evidence` during canary.

## Pre-Canary Decision
- Status: **GO (condicionado)**.
- Condition: maintain observability and no regression in EPI checks during canary window.
