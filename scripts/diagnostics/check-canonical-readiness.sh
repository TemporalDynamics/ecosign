#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
  echo "error: ripgrep (rg) is required" >&2
  exit 1
fi

NOW_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
TOTAL=0
FAILED=0

run_check() {
  local id="$1"
  local description="$2"
  local cmd="$3"

  TOTAL=$((TOTAL + 1))
  if bash -lc "$cmd" >/dev/null 2>&1; then
    printf "[PASS] %s - %s\n" "$id" "$description"
  else
    printf "[FAIL] %s - %s\n" "$id" "$description"
    FAILED=$((FAILED + 1))
  fi
}

echo "canonical readiness check at $NOW_UTC"
echo

# Authority and determinism
run_check "R01" "No feature-flag branching in decision path (fase1-executor)" \
  "! rg -n 'isDecisionUnderCanonicalAuthority\\(' supabase/functions/fase1-executor/index.ts"

run_check "R02" "No autonomous TSA requeue in executor" \
  "! rg -n 'requeueMissingTsaJobs\\(' supabase/functions/fase1-executor/index.ts"

run_check "R03" "No trigger-based enqueue for protect_document_v2 in migrations" \
  "! rg -n 'create_or_requeue_job\\([^)]*protect_document_v2|enqueue_executor_job\\([^)]*protect_document_v2|insert into executor_jobs[^\\n]*protect_document_v2' supabase/migrations"

run_check "R04" "No legacy anchor processors in active function tree" \
  "[ ! -d supabase/functions/process-polygon-anchors ] && [ ! -d supabase/functions/process-bitcoin-anchors ]"

run_check "R05" "Decision engine does not read env vars" \
  "! rg -n 'Deno\\.env|getFeatureFlag|isDecisionUnderCanonicalAuthority' supabase/functions/_shared/decisionEngineCanonical.ts supabase/functions/_shared/protectDocumentV2Decision.ts supabase/functions/_shared/protectDocumentV2PipelineDecision.ts"

run_check "R06" "No runtime writes to legacy document status columns from canonical executor" \
  "! rg -n 'overall_status|polygon_status|bitcoin_status' supabase/functions/fase1-executor/index.ts"

# Shadow and parallel routes
run_check "R07" "No wake-authority progression path" \
  "! rg -n 'wake-authority' supabase/functions | rg -v '^supabase/functions/wake-authority/'"

run_check "R08" "No direct anchor row mutation in canonical decision files" \
  "! rg -n '\\.from\\(\\\"anchors\\\"\\)|\\.from\\(\x27anchors\x27\\)' supabase/functions/_shared/decisionEngineCanonical.ts supabase/functions/_shared/protectDocumentV2Decision.ts supabase/functions/_shared/protectDocumentV2PipelineDecision.ts"

run_check "R09" "Decision functions depend only on events[]" \
  "! rg -n 'anchorStage|stepIndex|WithContext|context\\.' supabase/functions/_shared/decisionEngineCanonical.ts supabase/functions/_shared/protectDocumentV2Decision.ts supabase/functions/_shared/protectDocumentV2PipelineDecision.ts"

echo
if [ "$FAILED" -eq 0 ]; then
  echo "READY: $TOTAL/$TOTAL checks passed"
  exit 0
fi

echo "NOT READY: $((TOTAL - FAILED))/$TOTAL checks passed, $FAILED failed"
exit 1
