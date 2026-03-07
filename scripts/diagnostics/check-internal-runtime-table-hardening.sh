#!/usr/bin/env bash
set -euo pipefail

STATUS_JSON=""
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
fi

DB_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"
if [[ -z "$DB_URL" && -n "$STATUS_JSON" ]]; then
  DB_URL="$(printf '%s' "$STATUS_JSON" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(s.DB_URL||'')")"
fi

if [[ -z "$DB_URL" ]]; then
  echo "[internal-runtime-table-hardening] missing DATABASE_URL/SUPABASE_DB_URL and local DB_URL unavailable"
  exit 1
fi

echo "=== Internal runtime table hardening audit ==="
echo "DB: ${DB_URL}"

read -r -d '' AUDIT_SQL <<'SQL' || true
WITH internal_tables AS (
      SELECT unnest(ARRAY[
        'domain_outbox',
        'executor_job_runs',
        'executor_jobs',
        'welcome_email_queue',
        'system_workers',
        'executor_decision_logs',
        'shadow_decision_logs',
        'rate_limits',
        'rate_limit_blocks'
      ]) AS table_name
    ),
table_status AS (
  SELECT
    t.table_name,
    c.relrowsecurity AS rls_enabled,
    EXISTS (
      SELECT 1
      FROM information_schema.role_table_grants g
      WHERE g.table_schema = 'public'
        AND g.table_name = t.table_name
        AND g.grantee IN ('anon', 'authenticated')
        AND g.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
    ) AS has_anon_or_auth_grants,
    EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = t.table_name
        AND (
          NOT ('service_role' = ANY(p.roles))
          OR array_length(p.roles, 1) <> 1
        )
    ) AS has_non_service_role_policy,
    EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = t.table_name
        AND 'service_role' = ANY(p.roles)
    ) AS has_service_role_policy
  FROM internal_tables t
  JOIN pg_class c ON c.relname = t.table_name
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
)
SELECT
  table_name,
  rls_enabled,
  has_anon_or_auth_grants,
  has_non_service_role_policy,
  has_service_role_policy
FROM table_status
WHERE
  NOT rls_enabled
  OR has_anon_or_auth_grants
  OR has_non_service_role_policy
  OR NOT has_service_role_policy
ORDER BY table_name;
SQL

OFFENDERS="$(
  psql "$DB_URL" -v ON_ERROR_STOP=1 -P pager=off -F $'\t' -At -c "$AUDIT_SQL"
)"

if [[ -n "$OFFENDERS" ]]; then
  echo
  echo "❌ Internal runtime hardening violations found:"
  echo "$OFFENDERS"
  exit 1
fi

echo "✅ Internal runtime tables hardened (RLS ON, no anon/auth grants, service_role-only policies)."
