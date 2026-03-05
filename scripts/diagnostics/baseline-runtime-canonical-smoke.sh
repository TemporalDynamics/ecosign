#!/usr/bin/env bash
set -euo pipefail

OUTPUT_PATH="${1:-docs/baselines/runtime_baseline_$(date -u +%F).md}"

mkdir -p "$(dirname "$OUTPUT_PATH")"

echo "=== Baseline runtime canonical smoke ==="

STATUS_JSON="$(supabase status --output json 2>/dev/null | sed -n '/^{/,$p')"
API_URL="$(printf '%s' "$STATUS_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(s.API_URL||'')")"
ANON_KEY="$(printf '%s' "$STATUS_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(s.ANON_KEY||'')")"
SERVICE_ROLE_KEY="$(printf '%s' "$STATUS_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(s.SERVICE_ROLE_KEY||'')")"
DB_URL="$(printf '%s' "$STATUS_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(s.DB_URL||'')")"

if [[ -z "$API_URL" || -z "$ANON_KEY" || -z "$SERVICE_ROLE_KEY" || -z "$DB_URL" ]]; then
  echo "Missing API_URL/ANON_KEY/SERVICE_ROLE_KEY/DB_URL from supabase status."
  exit 1
fi

export SUPABASE_URL="$API_URL"
export SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
export DATABASE_URL="$DB_URL"
export SUPABASE_LOCAL="true"
export RUN_DB_INTEGRATION="1"

echo "[1/3] Canonical smoke tests..."
npx vitest run \
  tests/canonical-only/complete-pipeline-proof.test.ts \
  tests/integration/tsaEvents.test.ts \
  tests/authority/no_compat_direct_critical_paths.test.ts

echo "[2/3] Idempotency smoke (canonical flow e2e)..."
npx vitest run tests/e2e/canonical_system_e2e.test.ts

echo "[3/3] Closed-fail check on internal endpoint with anon token..."
HTTP_CODE="$(
  curl -sS -o /tmp/runtime_baseline_closed_fail_response.json -w "%{http_code}" \
    "${API_URL}/functions/v1/process-signer-signed" \
    -H "Authorization: Bearer ${ANON_KEY}" \
    -H 'Content-Type: application/json' \
    --data '{}'
)"

if [[ "$HTTP_CODE" != "401" && "$HTTP_CODE" != "403" ]]; then
  echo "Closed-fail check failed: expected 401/403, got ${HTTP_CODE}"
  cat /tmp/runtime_baseline_closed_fail_response.json || true
  exit 1
fi

{
  echo "# Runtime Baseline Smoke"
  echo
  echo "- Generated at (UTC): $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "- Canonical smoke tests: PASS"
  echo "- Canonical e2e idempotency smoke: PASS"
  echo "- Internal endpoint closed-fail with anon token: PASS (${HTTP_CODE})"
  echo
  echo "Closed-fail response sample:"
  echo '```json'
  cat /tmp/runtime_baseline_closed_fail_response.json
  echo
  echo '```'
} > "$OUTPUT_PATH"

echo "✅ Runtime baseline snapshot written to ${OUTPUT_PATH}"
