# EPI Release Acceptance Checklist (10 checks)

Release date: __________
Release id: __________
Reviewer: __________

Mark each as `YES` or `NO`.

Canonical command:
- `DATABASE_URL='...' npm run epi:hard-gate`

1. Runtime gate passes (`npm run phase1:gate` -> `READY: 14/14`).
- Result: ___

2. Runtime crons are canonical (`verify-runtime-crons.sh` -> `RESULT: PASS`).
- Result: ___

3. EPI invariants pass in hard-gate window (`verify_epi_invariants.sh` -> `hard_gate.post_freeze.*=0` and `PASSED`).
- Result: ___

4. Pre-canary SQL hard-gate returns zero violations (`EPI Precanary: Hard Gate (post_freeze)`).
- Result: ___

5. Three real E2E runs recorded (free direct, pro direct, signature flow).
- Result: ___

6. Verifier outputs are correct (`valid` / `valid_intermediate` / `valid`).
- Result: ___

7. Terminality is explicitly recorded (`workflow.completed`, `finalization_reference.final_state`).
- Result: ___

8. Entrypoint rule is preserved (no direct `executor_jobs` inserts outside gateway/compat).
- Result: ___

9. Strengthening metrics are within expected range (pending/failed/latency).
- Result: ___

10. Probative independence is proven (offline baseline + no login/private DB needed).
- Result: ___

## Final decision
- GO: ___
- NO-GO: ___
- Notes: _______________________________________________
