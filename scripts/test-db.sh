#!/usr/bin/env bash
set -euo pipefail

SUPABASE_URL_DEFAULT=""
SUPABASE_ANON_DEFAULT=""
SUPABASE_SERVICE_DEFAULT=""
DATABASE_URL_DEFAULT=""

if command -v supabase >/dev/null 2>&1; then
  STATUS_RAW="$(supabase status --output json 2>&1 || true)"
  STATUS_JSON="$(
    printf '%s\n' "$STATUS_RAW" | awk '
      BEGIN { capture = 0 }
      /^\{/ { capture = 1 }
      capture { print }
      /^}$/ { if (capture) exit }
    '
  )"
  if [[ -n "$STATUS_JSON" ]]; then
    SUPABASE_URL_DEFAULT="$(printf '%s' "$STATUS_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(s.API_URL||'')")"
    SUPABASE_ANON_DEFAULT="$(printf '%s' "$STATUS_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(s.ANON_KEY||'')")"
    SUPABASE_SERVICE_DEFAULT="$(printf '%s' "$STATUS_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(s.SERVICE_ROLE_KEY||'')")"
    DATABASE_URL_DEFAULT="$(printf '%s' "$STATUS_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(s.DB_URL||'')")"
  fi
fi

export SUPABASE_URL="${SUPABASE_URL:-$SUPABASE_URL_DEFAULT}"
export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-$SUPABASE_ANON_DEFAULT}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$SUPABASE_SERVICE_DEFAULT}"
export DATABASE_URL="${DATABASE_URL:-$DATABASE_URL_DEFAULT}"
export SUPABASE_LOCAL="true"
export RUN_DB_INTEGRATION="${RUN_DB_INTEGRATION:-1}"

if [[ -z "${SUPABASE_URL}" || -z "${SUPABASE_ANON_KEY}" || -z "${SUPABASE_SERVICE_ROLE_KEY}" || -z "${DATABASE_URL}" ]]; then
  echo "Missing required DB test env vars. Set SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY/DATABASE_URL or run: npm run sb:start" >&2
  exit 1
fi

echo "Running DB test gate against ${SUPABASE_URL}"
vitest run \
  tests/security/rls.test.ts \
  tests/security/storage.test.ts \
  tests/security/workflowCanvasAtomicity.test.ts \
  tests/integration/tsaEvents.test.ts \
  tests/canonical-only/complete-pipeline-proof.test.ts
