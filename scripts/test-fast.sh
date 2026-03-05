#!/usr/bin/env bash
set -euo pipefail

vitest run \
  --exclude "tests/security/rls.test.ts" \
  --exclude "tests/security/storage.test.ts" \
  --exclude "tests/security/rls-debug.test.ts" \
  --exclude "tests/integration/tsaEvents.test.ts" \
  --exclude "tests/canonical-only/complete-pipeline-proof.test.ts"
