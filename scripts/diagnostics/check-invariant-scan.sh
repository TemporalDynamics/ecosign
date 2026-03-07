#!/usr/bin/env bash
set -euo pipefail

THRESHOLDS_FILE="${THRESHOLDS_FILE:-security/invariant_thresholds.json}"

if [[ ! -f "$THRESHOLDS_FILE" ]]; then
  echo "[invariant-scan] missing thresholds file: $THRESHOLDS_FILE" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[invariant-scan] node is required" >&2
  exit 1
fi

# Validate thresholds file structure before doing anything with DB
THRESHOLDS_FILE="$THRESHOLDS_FILE" node <<'VALIDATE'
const fs = require('node:fs');
const raw = fs.readFileSync(process.env.THRESHOLDS_FILE, 'utf8');
const config = JSON.parse(raw);
const t = config.thresholds;
const required = ['stuck_minutes', 'attempt_threshold', 'queue_stale_minutes'];
for (const key of required) {
  if (!t[key] || typeof t[key].value !== 'number') {
    console.error(`[invariant-scan] thresholds.${key}.value is required and must be a number`);
    process.exit(1);
  }
}
console.log(
  `[invariant-scan] thresholds: stuck_minutes=${t.stuck_minutes.value}` +
  ` attempt_threshold=${t.attempt_threshold.value}` +
  ` queue_stale_minutes=${t.queue_stale_minutes.value}`
);
VALIDATE

# Resolve DB URL (same pattern as other diagnostics)
STATUS_JSON=""
if command -v supabase >/dev/null 2>&1; then
  STATUS_RAW="$(supabase status --output json 2>&1 || true)"
  STATUS_JSON="$(
    printf '%s\n' "$STATUS_RAW" | awk '
      BEGIN { capture = 0 }
      /^\{/ { capture = 1 }
      capture { print }
      /^\}$/ { if (capture) exit }
    '
  )"
fi

DB_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"
if [[ -z "$DB_URL" && -n "$STATUS_JSON" ]]; then
  DB_URL="$(printf '%s' "$STATUS_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(s.DB_URL||'')")"
fi

if [[ -z "$DB_URL" ]]; then
  echo "[invariant-scan] missing DATABASE_URL/SUPABASE_DB_URL and local DB_URL unavailable" >&2
  exit 1
fi

# Read threshold values
STUCK_MINUTES="$(THRESHOLDS_FILE="$THRESHOLDS_FILE" node -e "
const fs=require('node:fs');
const c=JSON.parse(fs.readFileSync(process.env.THRESHOLDS_FILE,'utf8'));
console.log(c.thresholds.stuck_minutes.value);
")"

ATTEMPT_THRESHOLD="$(THRESHOLDS_FILE="$THRESHOLDS_FILE" node -e "
const fs=require('node:fs');
const c=JSON.parse(fs.readFileSync(process.env.THRESHOLDS_FILE,'utf8'));
console.log(c.thresholds.attempt_threshold.value);
")"

QUEUE_STALE_MINUTES="$(THRESHOLDS_FILE="$THRESHOLDS_FILE" node -e "
const fs=require('node:fs');
const c=JSON.parse(fs.readFileSync(process.env.THRESHOLDS_FILE,'utf8'));
console.log(c.thresholds.queue_stale_minutes.value);
")"

echo "=== Invariant runtime scan ==="
echo "DB: ${DB_URL}"

SCAN_SQL="SELECT scan_runtime_invariant_violations(${STUCK_MINUTES}::integer, ${ATTEMPT_THRESHOLD}::integer, ${QUEUE_STALE_MINUTES}::integer);"
RESULT_JSON="$(psql "$DB_URL" -v ON_ERROR_STOP=1 -P pager=off -At -c "$SCAN_SQL")"

RESULT_JSON="$RESULT_JSON" node <<'PARSE'
const raw = process.env.RESULT_JSON;
const result = JSON.parse(raw);
const stuck = result.stuck_running_jobs || 0;
const high = result.high_attempt_jobs || 0;
const stale = result.stale_queued_jobs || 0;
const total = stuck + high + stale;

if (total > 0) {
  console.error(`[invariant-scan] violations detected: stuck=${stuck} high_attempts=${high} stale_queued=${stale}`);
  console.error('[invariant-scan] Check invariant_violations table for details.');
  process.exit(1);
}

console.log(`[invariant-scan] OK — no runtime anomalies (stuck=${stuck} high_attempts=${high} stale_queued=${stale})`);
PARSE
