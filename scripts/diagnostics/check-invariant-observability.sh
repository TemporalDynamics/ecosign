#!/usr/bin/env bash
set -euo pipefail

DB_URL="${DATABASE_URL:-}"
if [[ -z "$DB_URL" ]]; then
  STATUS_RAW="$(supabase status --output json 2>&1 || true)"
  STATUS_JSON="$(
    printf '%s' "$STATUS_RAW" | node -e "
      const raw = require('fs').readFileSync(0, 'utf8');
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start >= 0 && end > start) process.stdout.write(raw.slice(start, end + 1));
    "
  )"

  if [[ -z "$STATUS_JSON" ]]; then
    echo "❌ Unable to parse supabase status JSON output (and DATABASE_URL not set)" >&2
    exit 1
  fi

  DB_URL="$(printf '%s' "$STATUS_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(s.DB_URL||'')")"
fi

if [[ -z "$DB_URL" ]]; then
  echo "❌ DB_URL missing from supabase status" >&2
  exit 1
fi

mapfile -t DB_PARTS < <(
  node -e "
    const raw = process.argv[1];
    const u = new URL(raw);
    const db = (u.pathname || '/postgres').replace(/^\\//, '') || 'postgres';
    const lines = [
      u.hostname || '127.0.0.1',
      u.port || '5432',
      decodeURIComponent(u.username || 'postgres'),
      decodeURIComponent(u.password || ''),
      db,
      u.searchParams.get('sslmode') || '',
    ];
    process.stdout.write(lines.join('\n'));
  " "$DB_URL"
)

if [[ "${#DB_PARTS[@]}" -lt 5 ]]; then
  echo "❌ Could not parse DATABASE_URL" >&2
  exit 1
fi

export PGHOST="${DB_PARTS[0]}"
export PGPORT="${DB_PARTS[1]}"
export PGUSER="${DB_PARTS[2]}"
export PGPASSWORD="${DB_PARTS[3]}"
export PGDATABASE="${DB_PARTS[4]}"
DB_SSLMODE="${DB_PARTS[5]:-}"
if [[ -n "$DB_SSLMODE" ]]; then
  export PGSSLMODE="$DB_SSLMODE"
else
  unset PGSSLMODE || true
fi

echo "=== Runtime invariant scan ==="
SCAN_JSON="$(
  psql -At -v ON_ERROR_STOP=1 -c "select public.scan_runtime_invariant_violations(30, 8, 30)::text;"
)"
echo "scan=$SCAN_JSON"

echo
echo "=== Invariant violations (last 24h) ==="
psql -v ON_ERROR_STOP=1 -P pager=off -c "
select
  code,
  source,
  severity,
  sum(occurrences) as total_occurrences,
  max(last_seen_at) as last_seen_at
from public.invariant_violations
where last_seen_at >= now() - interval '24 hours'
group by code, source, severity
order by total_occurrences desc, last_seen_at desc
limit 20;
"

CRITICAL_COUNT="$(
  psql -At -v ON_ERROR_STOP=1 -c "
  select count(*)::text
  from public.invariant_violations
  where severity = 'critical'
    and last_seen_at >= now() - interval '24 hours';
  "
)"

echo
echo "critical_last_24h=$CRITICAL_COUNT"

if [[ "${INVARIANT_ALERT_STRICT:-0}" == "1" && "${CRITICAL_COUNT:-0}" != "0" ]]; then
  echo "❌ Critical invariant violations detected in last 24h (strict mode)." >&2
  exit 1
fi

echo "✅ Invariant observability check completed."
