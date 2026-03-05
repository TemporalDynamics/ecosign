#!/usr/bin/env bash
set -euo pipefail

OUTPUT_PATH="${1:-docs/baselines/authority_baseline_$(date -u +%F).md}"

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
  echo "[snapshot-authority-baseline] missing DATABASE_URL/SUPABASE_DB_URL and local DB_URL unavailable"
  exit 1
fi

DB_URL_DISPLAY="$(printf '%s' "$DB_URL" | sed -E 's#(postgresql://[^:]+):[^@]+@#\1:****@#')"

mkdir -p "$(dirname "$OUTPUT_PATH")"

VERIFY_JWT_FALSE_LIST="$(
  awk '
    /^\[functions\./ {
      fn=$0
      gsub(/^\[functions\./, "", fn)
      gsub(/\]$/, "", fn)
    }
    /^\s*verify_jwt\s*=\s*false/ {
      print fn
    }
  ' supabase/config.toml | sort
)"

SECDEF_EXPOSED="$(
  psql "$DB_URL" -v ON_ERROR_STOP=1 -P pager=off -F $'\t' -At -c "
    SELECT
      format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef
      AND n.nspname = 'public'
      AND (
        has_function_privilege('anon', p.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
      )
    ORDER BY 1;
  "
)"

INTERNAL_TABLE_MATRIX="$(
  psql "$DB_URL" -v ON_ERROR_STOP=1 -P pager=off -F $'\t' -At -c "
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
    )
    SELECT
      t.table_name,
      c.relrowsecurity::text AS rls_enabled,
      COALESCE(string_agg(DISTINCT CASE WHEN g.grantee='anon' THEN g.privilege_type END, ','), '-') AS anon_privs,
      COALESCE(string_agg(DISTINCT CASE WHEN g.grantee='authenticated' THEN g.privilege_type END, ','), '-') AS auth_privs,
      COALESCE(string_agg(DISTINCT CASE WHEN g.grantee='service_role' THEN g.privilege_type END, ','), '-') AS service_role_privs
    FROM internal_tables t
    JOIN pg_class c ON c.relname = t.table_name
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
    LEFT JOIN information_schema.role_table_grants g
      ON g.table_schema = 'public'
      AND g.table_name = t.table_name
      AND g.grantee IN ('anon', 'authenticated', 'service_role')
    GROUP BY t.table_name, c.relrowsecurity
    ORDER BY t.table_name;
  "
)"

DIRECT_WORKFLOW_SIGNERS_WRITES="$(
  rg -n "from\\('workflow_signers'\\).*update|UPDATE\\s+workflow_signers\\s+SET\\s+status|workflow_signers\\.status" supabase/functions -S || true
)"

DIRECT_SIGNATURE_WORKFLOWS_WRITES="$(
  rg -n "from\\('signature_workflows'\\).*update|UPDATE\\s+signature_workflows\\s+SET\\s+status|signature_workflows\\.status" supabase/functions -S || true
)"

{
  echo "# Authority Baseline Snapshot"
  echo
  echo "- Generated at (UTC): $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "- DB URL: \`${DB_URL_DISPLAY}\`"
  echo
  echo "## verify_jwt=false allowlist (config.toml)"
  echo
  if [[ -n "$VERIFY_JWT_FALSE_LIST" ]]; then
    printf '%s\n' "$VERIFY_JWT_FALSE_LIST" | sed 's/^/- /'
  else
    echo "- (empty)"
  fi
  echo
  echo "## SECURITY DEFINER exposed to anon/authenticated"
  echo
  if [[ -n "$SECDEF_EXPOSED" ]]; then
    printf '%s\n' "$SECDEF_EXPOSED" | sed 's/^/- /'
  else
    echo "- none"
  fi
  echo
  echo "## Internal runtime tables grants + RLS matrix"
  echo
  echo "| table | rls_enabled | anon_privs | auth_privs | service_role_privs |"
  echo "|---|---|---|---|---|"
  if [[ -n "$INTERNAL_TABLE_MATRIX" ]]; then
    while IFS=$'\t' read -r table rls anon auth service; do
      echo "| ${table} | ${rls} | ${anon:-} | ${auth:-} | ${service:-} |"
    done <<< "$INTERNAL_TABLE_MATRIX"
  fi
  echo
  echo "## Direct projection writers scan (supabase/functions)"
  echo
  echo "### workflow_signers.status patterns"
  if [[ -n "$DIRECT_WORKFLOW_SIGNERS_WRITES" ]]; then
    echo '```text'
    printf '%s\n' "$DIRECT_WORKFLOW_SIGNERS_WRITES"
    echo '```'
  else
    echo "- none"
  fi
  echo
  echo "### signature_workflows.status patterns"
  if [[ -n "$DIRECT_SIGNATURE_WORKFLOWS_WRITES" ]]; then
    echo '```text'
    printf '%s\n' "$DIRECT_SIGNATURE_WORKFLOWS_WRITES"
    echo '```'
  else
    echo "- none"
  fi
} > "$OUTPUT_PATH"

echo "✅ Authority baseline snapshot written to ${OUTPUT_PATH}"
