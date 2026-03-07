#!/usr/bin/env bash
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"
ANON_KEY_OVERRIDE="${SUPABASE_ANON_KEY:-}"

if [[ -z "$PROJECT_REF" || -z "$ACCESS_TOKEN" || -z "$DB_PASSWORD" ]]; then
  echo "[postdeploy-contract] missing required env vars: SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD" >&2
  exit 1
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "[postdeploy-contract] supabase CLI is required" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[postdeploy-contract] node is required" >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "[postdeploy-contract] curl is required" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "[postdeploy-contract] psql is required" >&2
  exit 1
fi

API_URL="https://${PROJECT_REF}.supabase.co"
DB_URL="postgresql://postgres@db.${PROJECT_REF}.supabase.co:5432/postgres?sslmode=require"

export SUPABASE_ACCESS_TOKEN="$ACCESS_TOKEN"
export PGPASSWORD="$DB_PASSWORD"
export DATABASE_URL="$DB_URL"

run_step() {
  local title="$1"
  shift
  echo
  echo "=== ${title} ==="
  "$@"
}

expect_http_in() {
  local label="$1"
  local method="$2"
  local url="$3"
  local expected_csv="$4"
  local data="${5:-}"

  local response_file
  response_file="$(mktemp)"
  local http_code

  if [[ "$method" == "POST" ]]; then
    http_code="$(
      curl -sS -o "$response_file" -w "%{http_code}" \
        "$url" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "apikey: ${ANON_KEY}" \
        -H "Authorization: Bearer ${ANON_KEY}" \
        --data "${data:-\{\}}"
    )"
  else
    http_code="$(
      curl -sS -o "$response_file" -w "%{http_code}" \
        "$url" \
        -H "apikey: ${ANON_KEY}" \
        -H "Authorization: Bearer ${ANON_KEY}"
    )"
  fi

  local expected_regex
  expected_regex="$(printf '%s' "$expected_csv" | sed 's/,/|/g')"

  if [[ ! "$http_code" =~ ^(${expected_regex})$ ]]; then
    echo "[postdeploy-contract] ${label} expected HTTP {${expected_csv}} got ${http_code}" >&2
    echo "Response sample:" >&2
    sed -n '1,80p' "$response_file" >&2 || true
    rm -f "$response_file"
    exit 1
  fi

  echo "${label}: HTTP ${http_code} ✅"
  rm -f "$response_file"
}

expect_http_not_in() {
  local label="$1"
  local method="$2"
  local url="$3"
  local denied_csv="$4"
  local data="${5:-}"

  local response_file
  response_file="$(mktemp)"
  local http_code

  if [[ "$method" == "POST" ]]; then
    http_code="$(
      curl -sS -o "$response_file" -w "%{http_code}" \
        "$url" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "apikey: ${ANON_KEY}" \
        -H "Authorization: Bearer ${ANON_KEY}" \
        --data "${data:-\{\}}"
    )"
  else
    http_code="$(
      curl -sS -o "$response_file" -w "%{http_code}" \
        "$url" \
        -H "apikey: ${ANON_KEY}" \
        -H "Authorization: Bearer ${ANON_KEY}"
    )"
  fi

  local denied_regex
  denied_regex="$(printf '%s' "$denied_csv" | sed 's/,/|/g')"

  if [[ "$http_code" =~ ^(${denied_regex})$ ]]; then
    echo "[postdeploy-contract] ${label} got denied HTTP ${http_code} (unexpected for public surface)" >&2
    sed -n '1,80p' "$response_file" >&2 || true
    rm -f "$response_file"
    exit 1
  fi

  if [[ "$http_code" =~ ^5 ]]; then
    echo "[postdeploy-contract] ${label} got server error HTTP ${http_code}" >&2
    sed -n '1,80p' "$response_file" >&2 || true
    rm -f "$response_file"
    exit 1
  fi

  echo "${label}: HTTP ${http_code} ✅"
  rm -f "$response_file"
}

if [[ -n "$ANON_KEY_OVERRIDE" ]]; then
  ANON_KEY="$ANON_KEY_OVERRIDE"
else
  run_step "Resolve project anon key" bash -c true
  KEYS_JSON="$(supabase projects api-keys --project-ref "$PROJECT_REF" -o json)"
  ANON_KEY="$(printf '%s' "$KEYS_JSON" | node -e "
  const raw = require('fs').readFileSync(0, 'utf8');
  const parsed = JSON.parse(raw);
  const keys = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.keys) ? parsed.keys : []);
  const pickToken = (obj) => {
    for (const field of ['api_key', 'key', 'value', 'jwt', 'token']) {
      const v = obj?.[field];
      if (typeof v === 'string' && v.length > 20) return v;
    }
    return '';
  };
  const decodeJwtRole = (token) => {
    try {
      const parts = String(token).split('.');
      if (parts.length !== 3) return '';
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
      const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
      return typeof payload?.role === 'string' ? payload.role : '';
    } catch {
      return '';
    }
  };
  const isSecretLike = (token) => token.startsWith('sb_secret_') || decodeJwtRole(token) === 'service_role';
  const isPublishableLike = (token) => token.startsWith('sb_publishable_') || decodeJwtRole(token) === 'anon';
  let anon = '';
  // 1) Prefer keys explicitly labeled anon/publishable and not secret-like.
  for (const k of keys) {
    const label = [k?.name, k?.type, k?.description, k?.id, k?.key_id].filter(Boolean).join(' ').toLowerCase();
    const token = pickToken(k);
    if (!token) continue;
    if ((label.includes('anon') || label.includes('publishable')) && !isSecretLike(token)) {
      anon = token;
      break;
    }
  }
  // 2) Fallback: any publishable-like token.
  if (!anon) {
    for (const k of keys) {
      const token = pickToken(k);
      if (token && isPublishableLike(token)) { anon = token; break; }
    }
  }
  // 3) Last resort: first non-secret-like token.
  if (!anon) {
    for (const k of keys) {
      const token = pickToken(k);
      if (token && !isSecretLike(token)) { anon = token; break; }
    }
  }
  process.stdout.write(anon);
")"
fi
if [[ -z "$ANON_KEY" ]]; then
  echo "[postdeploy-contract] could not resolve anon key from supabase projects api-keys" >&2
  exit 1
fi
if [[ "$ANON_KEY" == sb_secret_* ]]; then
  echo "[postdeploy-contract] resolved key looks like secret key (sb_secret_*). refusing to continue." >&2
  exit 1
fi
JWT_ROLE="$(printf '%s' "$ANON_KEY" | node -e "
  const token = require('fs').readFileSync(0, 'utf8').trim();
  try {
    const parts = token.split('.');
    if (parts.length !== 3) process.exit(0);
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    if (typeof payload?.role === 'string') process.stdout.write(payload.role);
  } catch {}
")"
if [[ "$JWT_ROLE" == "service_role" ]]; then
  echo "[postdeploy-contract] resolved key has JWT role=service_role. use publishable/anon key." >&2
  exit 1
fi
echo "anon key resolved ✅"

run_step "Public runtime surface check (verify_jwt=false allowlist)" bash -c true
expect_http_in 'health-check' 'GET' "${API_URL}/functions/v1/health-check" '200,204'
expect_http_not_in 'signing-keys unauth surface' 'GET' "${API_URL}/functions/v1/signing-keys" '401,403'
expect_http_not_in 'presential-verification-get-acta unauth surface' 'GET' "${API_URL}/functions/v1/presential-verification-get-acta" '401,403'

run_step "Internal auth closed-fail check" bash -c true
expect_http_in \
  'process-signer-signed closed fail' \
  'POST' \
  "${API_URL}/functions/v1/process-signer-signed" \
  '401,403' \
  '{"event_id":"00000000-0000-0000-0000-000000000000"}'

run_step "Remote grants + SECURITY DEFINER hardening checks" bash -c true
bash scripts/diagnostics/check-internal-runtime-table-hardening.sh
bash scripts/diagnostics/check-security-definer-exec-allowlist.sh

run_step "Remote canonical flow smoke (projection recovery drill, transactional)" bash -c true
PROJECTION_LOG_FILE="$(mktemp)"
trap 'rm -f "$PROJECTION_LOG_FILE"' EXIT
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f scripts/diagnostics/incident_recovery_projection_drill.sql > "$PROJECTION_LOG_FILE"
grep -q '✅ INCIDENT PROJECTION DRILL PASSED' "$PROJECTION_LOG_FILE"
cat "$PROJECTION_LOG_FILE"

run_step "Remote schema drift contract check" bash -c true
bash scripts/diagnostics/check-schema-drift.sh

echo
echo "✅ Post-deploy contractual verification PASSED."
