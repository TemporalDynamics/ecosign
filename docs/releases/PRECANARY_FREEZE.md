# Pre-Canary Freeze Snapshot

- Freeze date: 2026-02-14
- Freeze branch baseline: `main`
- Baseline commit at freeze start: `80f8116`

## Scope Locked
- EPI witness policy: fail-hard, immutable `signed/...` only.
- Workflow model: CLOSED (terminal workflows are not reopened).
- Share OTP path resolution hardened for signed/legacy documents.
- Signer flow completion UI constrained to downloads only (no owner documents navigation).

## Verification Artifacts
- `docs/releases/artifacts/2026-02-14-precanary-freeze/verify_epi_invariants.out`
- `docs/releases/artifacts/2026-02-14-precanary-freeze/verify_precanary_epi.sql`
- `docs/releases/artifacts/2026-02-14-precanary-freeze/verify_precanary_epi.out`

## Verification Status
- `verify_epi_invariants.sh`: blocked in this shell (missing `DATABASE_URL` / `SUPABASE_DB_URL`).
- `verify_precanary_epi.sql`: copied as freeze artifact; execution pending DB URL in shell.

## Deploy State (reported)
- Edge Functions deploy: completed (no-change deploy accepted by CLI).
- DB push: reported up-to-date in earlier run; migration history mismatch warning later references legacy file naming (`20260213`).

## Canary Gate (Required Before Go)
- Run both SQL invariant checks against production and store outputs in artifacts.
- Confirm no 404/object-not-found in preview/download for protect, signer flow, and Mi Firma.
- Confirm Share OTP green on protect/workflow/Mi Firma for canonical witness artifact.
- Hold 24h no-feature-change window after freeze tag.
