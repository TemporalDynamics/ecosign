# EPI Operational Certification Plan (v1)

Status: ACTIVE
Date: 2026-02-19
Scope: runtime health, semantic integrity, verifier behavior, and go/no-go

## Day 1 — Runtime + semantic baseline
Single-command option:
- `DATABASE_URL='...' npm run epi:hard-gate`

Expanded steps:
1. `npm run phase1:gate`
2. `DATABASE_URL='...' bash scripts/verify-runtime-crons.sh`
3. `DATABASE_URL='...' bash verify_epi_invariants.sh`
4. `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/verify_precanary_epi.sql`

Expected:
- `READY: 14/14 checks passed`
- runtime crons `RESULT: PASS`
- EPI invariants `hard_gate.post_freeze.*=0` and `PASSED`
- SQL verification hard-gate with zero violations (`EPI Precanary: Hard Gate (post_freeze)`)

## Day 2-3 — Real E2E runs + verifier states
Run 3 real flows and register evidence:
1. direct protection (free)
2. direct protection (pro)
3. signature flow (intermediate and final)

For each run store:
- `entity_id`
- `workflow_id` (if applicable)
- `workflow.completed` present/absent
- `finalization_reference.final_state`
- event -> job -> run chain
- `event_to_job_gap`
- verifier result

Verifier expected states:
- protect free -> `valid`
- protect pro -> `valid`
- signature intermediate -> `valid_intermediate`
- signature final -> `valid`

## Day 4 — Entrypoint governance
Hard rule:
- no direct insert to `executor_jobs` outside gateway or documented compat path.

Checks:
1. `npm run diag:entrypoint-guard`
2. static review for new entrypoints in PR diff

## Day 5-6 — Strengthening observability
Track and report:
1. `anchors_pending_rate`
2. `anchors_failed_rate`
3. `anchor_confirmation_latency`
4. backlog/retry/dead trends

## Day 7 — Independence proof
Must demonstrate:
1. verifier offline baseline works
2. artifact verifiable without login/private DB

## Go/No-Go (final)
Go only if all hold:
1. 3 real E2E runs complete
2. EPI invariants zero violations
3. verifier states correct (`valid`/`valid_intermediate`)
4. claims and runtime crons correct
5. offline independence verified
6. `event_to_job_gap` within threshold
7. strengthening metrics within expected range

No-Go if any item fails.
