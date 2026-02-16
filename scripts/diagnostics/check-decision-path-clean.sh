#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
  echo "error: ripgrep (rg) is required" >&2
  exit 1
fi

TARGETS=(
  "supabase/functions/_shared/decisionEngineCanonical.ts"
  "supabase/functions/_shared/protectDocumentV2Decision.ts"
  "supabase/functions/_shared/protectDocumentV2PipelineDecision.ts"
)

echo "decision path cleanliness check at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo

PATTERN="from\\('anchors'\\)|from\\('user_documents'\\)|from\\('workflow_events'\\)"
if rg -n "$PATTERN" "${TARGETS[@]}"; then
  echo
  echo "RESULT: FAIL (legacy/projection reads detected in decision path)"
  exit 1
fi

echo "[PASS] no legacy/projection table reads in decision path"
echo "RESULT: PASS"
