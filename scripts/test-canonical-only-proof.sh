#!/usr/bin/env bash
set -euo pipefail

REQUIRE_REAL_PROOF="${REQUIRE_REAL_PROOF:-0}"

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

LATEST_EVIDENCE="$(ls -1t tests/canonical-only/evidence/*.json | head -n 1)"
echo
echo "latest evidence: ${LATEST_EVIDENCE}"

if [ "$REQUIRE_REAL_PROOF" = "1" ]; then
  echo "4) enforcing real proof (no skipped evidence)..."
  node -e "
    const fs = require('fs');
    const p = process.argv[1];
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (data && data.skipped === true) {
      console.error('error: canonical proof was skipped: ' + (data.skip_reason || 'unknown'));
      process.exit(1);
    }
    console.log('[PASS] real canonical proof confirmed (not skipped)');
  " "$LATEST_EVIDENCE"
fi

echo
echo "[PASS] canonical-only proof complete"
