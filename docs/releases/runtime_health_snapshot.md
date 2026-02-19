# Runtime Health Snapshot

Date: 2026-02-19
Scope: Day 1 baseline (runtime + semantic)

## 1) phase1 gate
Command:
- `npm run phase1:gate`

Result:
- PASS
- `READY: 14/14 checks passed`

## 2) runtime cron verification
Command:
- `bash scripts/verify-runtime-crons.sh`

Result:
- BLOCKED
- Error: `set DATABASE_URL or STAGING_DATABASE_URL`

## 3) EPI invariants verification
Command:
- `bash verify_epi_invariants.sh`

Result:
- BLOCKED
- Error: `DATABASE_URL or SUPABASE_DB_URL is required`

## 4) pre-canary SQL verification
Command:
- `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/verify_precanary_epi.sql`

Result:
- BLOCKED
- Cause: no `DATABASE_URL` configured in current shell.

## 5) Day 1 status
- Runtime architecture gate: GREEN
- DB-backed semantic checks: PENDING (connection env missing)

## 6) Immediate next commands
Set DB URL for target env and run:

```bash
export DATABASE_URL='postgresql://...'
npm run epi:hard-gate
```

Expected:
- runtime crons -> `RESULT: PASS`
- EPI invariants -> `hard_gate.post_freeze.*=0` and `EPI invariant check PASSED.`
- pre-canary SQL -> hard-gate table with zero violations
