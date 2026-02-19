#!/usr/bin/env bash
set -euo pipefail

# Unified hard gate for release/canary:
# 1) phase1 static/runtime guardrails
# 2) runtime crons canonical status
# 3) EPI invariants (post-freeze hard gate + historical debt report)
# 4) pre-canary SQL checks (post-freeze hard gate + historical debt report)

DB_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"
if [[ -z "${DB_URL}" ]]; then
  echo "ERROR: set DATABASE_URL or SUPABASE_DB_URL before running epi:hard-gate." >&2
  exit 2
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql is not installed or not in PATH." >&2
  exit 2
fi

# Normalize for downstream scripts expecting DATABASE_URL.
export DATABASE_URL="${DB_URL}"

echo "=== EPI Hard Gate: phase1 ==="
npm run phase1:gate

echo
echo "=== EPI Hard Gate: runtime crons ==="
bash scripts/verify-runtime-crons.sh

echo
echo "=== EPI Hard Gate: invariants ==="
bash verify_epi_invariants.sh

echo
echo "=== EPI Hard Gate: pre-canary SQL ==="
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f scripts/db/verify_precanary_epi.sql

echo
echo "EPI hard gate PASSED."
