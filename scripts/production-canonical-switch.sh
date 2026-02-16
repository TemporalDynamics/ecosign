#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SWITCH_ENV="${SWITCH_ENV:-production}"

echo "canonical authority production switch gate"
echo "started at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "switch_env: ${SWITCH_ENV}"
echo

echo "1) canonical readiness gate..."
bash scripts/diagnostics/check-canonical-readiness.sh

echo
echo "2) decision path cleanliness..."
bash scripts/diagnostics/check-decision-path-clean.sh

echo
echo "3) runtime cron verification..."
bash scripts/verify-runtime-crons.sh

echo
echo "4) canonical proof evidence..."
if [ "$SWITCH_ENV" = "production" ]; then
  REQUIRE_REAL_PROOF=1 bash scripts/test-canonical-only-proof.sh
else
  bash scripts/test-canonical-only-proof.sh
fi

echo
echo "READY FOR PRODUCTION CANONICAL AUTHORITY"
