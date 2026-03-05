#!/usr/bin/env bash
set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI is required" >&2
  exit 1
fi

STATUS_RAW="$(supabase status --output json 2>/dev/null || true)"
STATUS_JSON="$(printf '%s\n' "$STATUS_RAW" | sed -n '/^{/,$p')"
if [[ -z "$STATUS_JSON" ]]; then
  echo "Could not read local Supabase status. Run: npm run sb:start" >&2
  exit 1
fi

SUPABASE_URL_DEFAULT="$(printf '%s' "$STATUS_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(s.API_URL||'')")"
SUPABASE_ANON_DEFAULT="$(printf '%s' "$STATUS_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(s.ANON_KEY||'')")"
SUPABASE_SERVICE_DEFAULT="$(printf '%s' "$STATUS_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(s.SERVICE_ROLE_KEY||'')")"
DATABASE_URL_DEFAULT="$(printf '%s' "$STATUS_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(s.DB_URL||'')")"

export SUPABASE_URL="${SUPABASE_URL:-$SUPABASE_URL_DEFAULT}"
export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-$SUPABASE_ANON_DEFAULT}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$SUPABASE_SERVICE_DEFAULT}"
export DATABASE_URL="${DATABASE_URL:-$DATABASE_URL_DEFAULT}"
export SUPABASE_LOCAL="true"
export RUN_DB_INTEGRATION="${RUN_DB_INTEGRATION:-1}"

if [[ -z "${SUPABASE_URL}" || -z "${SUPABASE_ANON_KEY}" || -z "${SUPABASE_SERVICE_ROLE_KEY}" || -z "${DATABASE_URL}" ]]; then
  echo "Missing required DB test env vars. Check supabase status and local stack." >&2
  exit 1
fi

echo "Running DB test gate against ${SUPABASE_URL}"
vitest run \
  tests/security/rls.test.ts \
  tests/security/storage.test.ts \
  tests/integration/tsaEvents.test.ts \
  tests/canonical-only/complete-pipeline-proof.test.ts
