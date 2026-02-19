#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
  echo "error: ripgrep (rg) is required" >&2
  exit 1
fi

FAILED=0

echo "executor entrypoint guard at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo

# G01: runtime code must not insert directly into executor_jobs.
DIRECT_INSERT_PATTERN="\\.from\\(['\" ]*executor_jobs['\" ]*\\)\\s*\\.insert\\("
if rg -n "$DIRECT_INSERT_PATTERN" supabase/functions packages >/tmp/entrypoint_guard_direct_inserts.txt; then
  echo "[FAIL] G01 - direct runtime inserts to executor_jobs detected"
  cat /tmp/entrypoint_guard_direct_inserts.txt
  FAILED=$((FAILED + 1))
else
  echo "[PASS] G01 - no direct runtime inserts to executor_jobs"
fi

# G02: claim_initial_decision_jobs only in fase1-executor.
CLAIM_INITIAL_FILES="$(rg -l "claim_initial_decision_jobs" supabase/functions || true)"
if [ "$CLAIM_INITIAL_FILES" = "supabase/functions/fase1-executor/index.ts" ]; then
  echo "[PASS] G02 - claim_initial_decision_jobs scoped to fase1-executor"
else
  echo "[FAIL] G02 - claim_initial_decision_jobs scope drift"
  printf '%s\n' "$CLAIM_INITIAL_FILES" | sed '/^$/d'
  FAILED=$((FAILED + 1))
fi

# G03: claim_orchestrator_jobs only in orchestrator.
CLAIM_ORCH_FILES="$(rg -l "claim_orchestrator_jobs" supabase/functions || true)"
if [ "$CLAIM_ORCH_FILES" = "supabase/functions/orchestrator/index.ts" ]; then
  echo "[PASS] G03 - claim_orchestrator_jobs scoped to orchestrator"
else
  echo "[FAIL] G03 - claim_orchestrator_jobs scope drift"
  printf '%s\n' "$CLAIM_ORCH_FILES" | sed '/^$/d'
  FAILED=$((FAILED + 1))
fi

echo
if [ "$FAILED" -eq 0 ]; then
  echo "RESULT: PASS"
  exit 0
fi

echo "RESULT: FAIL ($FAILED checks failed)"
exit 1
