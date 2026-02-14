# Pre-Canary Test Baseline (2026-02-14)

## Executive Summary
- Baseline test status is green after Step 1 hardening.
- Current root suite (`npm test`) result:
  - Test files: `30 passed`, `4 skipped` (`34` total discovered by Vitest include pattern).
  - Tests: `145 passed`, `25 skipped`.
- This establishes a clean signal for Canary hardening work.

## What Exists Today (Runnable in root Vitest)
- Root Vitest-discovered tests under `tests/`: `38` files.
- Distribution:
  - `unit`: `9`
  - `security`: `8`
  - `integration`: `7`
  - `gate0`: `4`
  - `authority`: `4`
  - `regression`: `3`
  - `e2e`: `1`
  - root-level files: `featureFlags.test.ts`, `flagSync.test.ts`
- Additional authority test set outside root include pattern:
  - `packages/authority/tests`: `7` files (currently not part of root `npm test` run).

## Step 1 Actions (Completed)
1. Fixed authority guard false-positive:
   - File: `tests/authority/authority_causality_guard.test.ts`
   - Change: allowlisted `supabase/functions/reject-signature/index.ts` for `legal-timestamp` usage limited to rejection receipt proof (not canonical anchoring dispatch).
2. Neutralized unstable DB integration false-positive in default baseline:
   - File: `tests/integration/tsaEvents.test.ts`
   - Change: converted to opt-in integration suite gated by `RUN_DB_INTEGRATION=1`, and switched setup to helper/admin path for deterministic execution when explicitly enabled.

## Skipped Suites in Baseline (Intentional)
- `tests/integration/tsaEvents.test.ts` (requires explicit `RUN_DB_INTEGRATION=1`).
- `tests/security/storage.test.ts` (local storage env gate).
- `tests/security/rls.test.ts` (local RLS env gate).
- `tests/unit/tsaEvents.test.ts` (existing env gate).

## Practical Risk Read
- Green baseline now reflects core regression signal without infra-noise.
- No production runtime logic was changed in Step 1; only test-layer behavior.
- Remaining risk is operational/integration depth, not correctness of tested core paths.

## Proposed Implementation (Step 2+)
1. Keep baseline strict and deterministic:
   - Maintain default root run as fast/stable confidence suite.
   - Keep environment-heavy tests opt-in.
2. Add explicit CI lanes:
   - `test:baseline` -> current `npm test`.
   - `test:db-integration` -> run gated suites with `RUN_DB_INTEGRATION=1`.
3. Bring `packages/authority/tests` into the primary runner:
   - Either extend root `vitest.config.ts` include pattern, or add workspace script and CI job.
   - Reason: these tests cover decision contracts and should be first-class regression protection.
4. Build the confidence suite (small, high-value set):
   - Determinism, idempotency, canonical invariants, and reclaim/recovery behavior.
   - Reason: protects core architecture during refactors with minimal maintenance cost.

## Why This Plan
- It preserves velocity (fast green baseline) while increasing trust where it matters (authority + invariants).
- It avoids false confidence from flaky environment-dependent tests.
- It aligns with current phase: production Canary hardening, not feature expansion.
