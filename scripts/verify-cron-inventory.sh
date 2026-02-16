#!/usr/bin/env bash
set -euo pipefail

DB_URL="${DATABASE_URL:-${STAGING_DATABASE_URL:-}}"

if [ -z "${DB_URL}" ]; then
  echo "error: set DATABASE_URL or STAGING_DATABASE_URL" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "error: psql is required" >&2
  exit 1
fi

echo "cron inventory verification at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo

SQL="
WITH inv AS (
  SELECT * FROM public.get_cron_status('%')
),
checks AS (
  SELECT 'runtime-tick active' AS check_name,
         EXISTS (SELECT 1 FROM inv WHERE jobname = 'runtime-tick' AND active = true) AS ok
  UNION ALL
  SELECT 'recover-orphan-anchors active' AS check_name,
         EXISTS (SELECT 1 FROM inv WHERE jobname = 'recover-orphan-anchors' AND active = true) AS ok
  UNION ALL
  SELECT 'process-polygon-anchors disabled/absent' AS check_name,
         NOT EXISTS (SELECT 1 FROM inv WHERE jobname = 'process-polygon-anchors' AND active = true) AS ok
  UNION ALL
  SELECT 'process-bitcoin-anchors disabled/absent' AS check_name,
         NOT EXISTS (SELECT 1 FROM inv WHERE jobname = 'process-bitcoin-anchors' AND active = true) AS ok
)
SELECT CASE WHEN ok THEN '[PASS] ' ELSE '[FAIL] ' END || check_name
FROM checks
ORDER BY check_name;
"

psql "$DB_URL" -v ON_ERROR_STOP=1 -At -c "$SQL"

FAILS="$(psql "$DB_URL" -v ON_ERROR_STOP=1 -At -c "
WITH inv AS (SELECT * FROM public.get_cron_status('%')),
checks AS (
  SELECT EXISTS (SELECT 1 FROM inv WHERE jobname = 'runtime-tick' AND active = true) AS ok
  UNION ALL
  SELECT EXISTS (SELECT 1 FROM inv WHERE jobname = 'recover-orphan-anchors' AND active = true) AS ok
  UNION ALL
  SELECT NOT EXISTS (SELECT 1 FROM inv WHERE jobname = 'process-polygon-anchors' AND active = true) AS ok
  UNION ALL
  SELECT NOT EXISTS (SELECT 1 FROM inv WHERE jobname = 'process-bitcoin-anchors' AND active = true) AS ok
)
SELECT COUNT(*) FROM checks WHERE ok = false;
")"

echo
if [ "$FAILS" = "0" ]; then
  echo "RESULT: PASS (runtime cron inventory matches canonical expectations)"
  exit 0
fi

echo "RESULT: FAIL ($FAILS inventory checks failed)"
exit 1
