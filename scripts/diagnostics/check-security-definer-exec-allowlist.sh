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
  echo "[security-definer-allowlist] missing DATABASE_URL/SUPABASE_DB_URL and local DB_URL unavailable"
  exit 1
fi

echo "=== SECURITY DEFINER execute allowlist audit ==="

read -r -d '' AUDIT_SQL <<'SQL' || true
WITH allowlisted(signature) AS (
  VALUES
    ('public.create_document_folder(_name text)'),
    ('public.rename_document_folder(_folder_id uuid, _name text)'),
    ('public.delete_document_folder(_folder_id uuid)'),
    ('public.move_documents_to_folder(_doc_ids uuid[], _folder_id uuid)'),
    ('public.request_certificate_regeneration(_document_id uuid, _request_type text)')
),
secdef AS (
  SELECT
    format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) AS signature,
    has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
    has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_exec
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
),
violations AS (
  SELECT
    s.signature,
    s.anon_exec,
    s.auth_exec,
    s.service_exec,
    CASE
      WHEN a.signature IS NOT NULL AND s.anon_exec THEN 'allowlisted secdef must not be executable by anon'
      WHEN a.signature IS NOT NULL AND NOT s.auth_exec THEN 'allowlisted secdef must be executable by authenticated'
      WHEN a.signature IS NOT NULL AND NOT s.service_exec THEN 'allowlisted secdef must be executable by service_role'
      WHEN a.signature IS NULL AND s.anon_exec THEN 'non-allowlisted secdef executable by anon'
      WHEN a.signature IS NULL AND s.auth_exec THEN 'non-allowlisted secdef executable by authenticated'
      ELSE NULL
    END AS reason
  FROM secdef s
  LEFT JOIN allowlisted a ON a.signature = s.signature
)
SELECT signature, anon_exec, auth_exec, service_exec, reason
FROM violations
WHERE reason IS NOT NULL
ORDER BY signature;
SQL

VIOLATIONS="$(
  psql "$DB_URL" -v ON_ERROR_STOP=1 -P pager=off -F $'\t' -At -c "$AUDIT_SQL"
)"

if [[ -n "$VIOLATIONS" ]]; then
  echo "❌ SECURITY DEFINER allowlist violations found:"
  echo "$VIOLATIONS"
  exit 1
fi

echo "✅ SECURITY DEFINER exec surface matches allowlist."
