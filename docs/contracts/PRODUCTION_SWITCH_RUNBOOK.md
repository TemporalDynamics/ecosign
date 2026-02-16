# Production Switch Runbook (No Staging)

Date: 2026-02-16
Status: Active

## Decision

When no dedicated staging exists, use a **production canary proof** with strict gates.
Do not accept "skipped" canonical proof evidence for go-live.

## Why this is the correct strategy

1. It validates real runtime conditions (actual cron/jobs/functions).
2. It avoids false confidence from synthetic schema copies.
3. It keeps risk controlled through a single, isolated proof run + cleanup.

## Preconditions

- `DATABASE_URL` available for runtime cron checks.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` available for proof test.
- On-call window and rollback owner assigned.

## Go/No-Go Command

```bash
SWITCH_ENV=production npm run prod:canonical-switch
```

This enforces:
- 13/13 readiness checks
- Decision-path cleanliness
- Runtime cron verification
- Canonical proof evidence with `REQUIRE_REAL_PROOF=1` (no skipped evidence allowed)

## Rollback trigger

Rollback immediately if:
- Any gate fails.
- Canonical proof is skipped or incomplete.
- Post-switch monitoring shows stuck growth in pending anchors/jobs.

## Minimal rollback actions

1. Stop switch procedure.
2. Re-enable prior operational paths if they were disabled in the change window.
3. Re-run diagnostics:
   - `bash scripts/diagnostics/check-canonical-readiness.sh`
   - `bash scripts/verify-runtime-crons.sh`
4. Record incident evidence and root cause before retry.
