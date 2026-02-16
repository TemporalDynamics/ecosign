#!/usr/bin/env bash
set -euo pipefail

echo "canonical-only e2e proof"
echo "started at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo

echo "1) verifying runtime crons..."
./scripts/verify-runtime-crons.sh

echo
echo "2) running canonical-only proof test..."
npm run test:canonical-proof

echo
echo "3) validating evidence report files..."
if ! ls -la tests/canonical-only/evidence/*.json >/dev/null 2>&1; then
  echo "error: no evidence report generated in tests/canonical-only/evidence/" >&2
  exit 1
fi
ls -la tests/canonical-only/evidence/*.json

echo
echo "[PASS] canonical-only proof complete"
