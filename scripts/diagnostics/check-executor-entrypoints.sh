#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
  echo "error: ripgrep (rg) is required" >&2
  exit 1
fi

FAILED=0
ALLOWLIST_FILE="scripts/diagnostics/allowlists/executor_jobs_direct_insert_compat.txt"

echo "executor entrypoint guard at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo

# G01: runtime code must not insert directly into executor_jobs.
# Match multiline direct chains only:
# .from('executor_jobs')
#   .insert(...)
DIRECT_INSERT_PATTERN="(?s)\\.from\\(['\" ]*executor_jobs['\" ]*\\)\\s*\\.insert\\("
TMP_MATCHES="/tmp/entrypoint_guard_executor_jobs_direct_raw.txt"
TMP_HITS="/tmp/entrypoint_guard_direct_inserts_hits.txt"
TMP_VIOLATIONS="/tmp/entrypoint_guard_direct_inserts_violations.txt"
TMP_COMPAT="/tmp/entrypoint_guard_direct_inserts_compat.txt"
: >"$TMP_HITS"
: >"$TMP_VIOLATIONS"
: >"$TMP_COMPAT"

rg -n -P -U "$DIRECT_INSERT_PATTERN" supabase/functions packages >"$TMP_MATCHES" || true
awk -F: '/\.from\(/{print $1 ":" $2}' "$TMP_MATCHES" | sort -u >"$TMP_HITS"

if [ -s "$TMP_HITS" ]; then
  while IFS=: read -r file line; do
    if [ -f "$ALLOWLIST_FILE" ] && rg -q -x "$file" "$ALLOWLIST_FILE"; then
      printf '%s:%s\n' "$file" "$line" >>"$TMP_COMPAT"
    else
      printf '%s:%s\n' "$file" "$line" >>"$TMP_VIOLATIONS"
    fi
  done <"$TMP_HITS"
fi

if [ -s "$TMP_COMPAT" ]; then
  echo "[WARN] G01 - direct runtime inserts found but allowlisted as compat-mode"
  cat "$TMP_COMPAT"
fi

if [ -s "$TMP_VIOLATIONS" ]; then
  echo "[FAIL] G01 - non-allowlisted direct runtime inserts to executor_jobs detected"
  cat "$TMP_VIOLATIONS"
  FAILED=$((FAILED + 1))
else
  if [ -s "$TMP_COMPAT" ]; then
    echo "[PASS] G01 - only allowlisted compat direct inserts remain"
  else
    echo "[PASS] G01 - no direct runtime inserts to executor_jobs"
  fi
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
