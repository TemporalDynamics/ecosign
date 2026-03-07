#!/usr/bin/env bash
set -euo pipefail

SCHEMA="${SCHEMA:-public}"
UPDATE_MODE=0
HASH_FILE="docs/baselines/${SCHEMA}_schema_hash.sha256"
FINGERPRINT_FILE="docs/baselines/${SCHEMA}_schema_fingerprint.txt"
DATABASE_URL_INPUT="${DATABASE_URL:-}"

usage() {
  cat <<'EOF'
Usage: bash scripts/diagnostics/check-schema-drift.sh [options]

Options:
  --update                    Regenera baseline hash + fingerprint.
  --db-url <url>             Connection string PostgreSQL.
  --schema <name>            Schema a inspeccionar (default: public).
  --hash-file <path>         Archivo con hash esperado.
  --fingerprint-file <path>  Archivo con fingerprint esperado.
  -h, --help                 Show this help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --update)
      UPDATE_MODE=1
      shift
      ;;
    --db-url)
      DATABASE_URL_INPUT="$2"
      shift 2
      ;;
    --schema)
      SCHEMA="$2"
      HASH_FILE="docs/baselines/${SCHEMA}_schema_hash.sha256"
      FINGERPRINT_FILE="docs/baselines/${SCHEMA}_schema_fingerprint.txt"
      shift 2
      ;;
    --hash-file)
      HASH_FILE="$2"
      shift 2
      ;;
    --fingerprint-file)
      FINGERPRINT_FILE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

resolve_db_url_from_supabase_status() {
  if ! command -v supabase >/dev/null 2>&1; then
    return 0
  fi

  local raw status_json
  raw="$(supabase status --output json 2>&1 || true)"
  status_json="$(
    printf '%s\n' "$raw" | awk '
      BEGIN { capture = 0 }
      /^\{/ { capture = 1 }
      capture { print }
      /^}$/ { if (capture) exit }
    '
  )"

  if [[ -z "$status_json" ]]; then
    return 0
  fi

  DATABASE_URL_INPUT="$(printf '%s' "$status_json" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(s.DB_URL||'')")"
}

if [[ -z "$DATABASE_URL_INPUT" ]]; then
  resolve_db_url_from_supabase_status
fi

if [[ -z "$DATABASE_URL_INPUT" ]]; then
  echo "[schema-drift] Missing DATABASE_URL/--db-url and supabase status did not return DB_URL" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "[schema-drift] psql is required" >&2
  exit 1
fi

if ! command -v sha256sum >/dev/null 2>&1; then
  echo "[schema-drift] sha256sum is required" >&2
  exit 1
fi

if [[ ! "$SCHEMA" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  echo "[schema-drift] Invalid schema name: $SCHEMA" >&2
  exit 1
fi

TMP_FINGERPRINT="$(mktemp)"
TMP_DIFF="$(mktemp)"
trap 'rm -f "$TMP_FINGERPRINT" "$TMP_DIFF"' EXIT

SQL_QUERY=$(cat <<SQL
WITH lines AS (
  SELECT format('EXTENSION|%I|%s', e.extname, e.extversion) AS line
  FROM pg_extension e
  WHERE e.extname <> 'plpgsql'

  UNION ALL

  SELECT format('TABLE|%I.%I|%s', n.nspname, c.relname, c.relkind)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = '$SCHEMA'
    AND c.relkind IN ('r', 'p', 'v', 'm', 'f')

  UNION ALL

  SELECT format(
    'COLUMN|%I.%I|%s|%I|%s|%s|%s|%s|%s',
    n.nspname,
    c.relname,
    a.attnum,
    a.attname,
    pg_catalog.format_type(a.atttypid, a.atttypmod),
    CASE WHEN a.attnotnull THEN 'NOT_NULL' ELSE 'NULL' END,
    COALESCE(pg_get_expr(ad.adbin, ad.adrelid), ''),
    COALESCE(NULLIF(a.attidentity, ''), '-'),
    COALESCE(NULLIF(a.attgenerated, ''), '-')
  )
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
  WHERE n.nspname = '$SCHEMA'
    AND c.relkind IN ('r', 'p')
    AND a.attnum > 0
    AND NOT a.attisdropped

  UNION ALL

  SELECT format(
    'CONSTRAINT|%I.%I|%I|%s',
    n.nspname,
    c.relname,
    con.conname,
    pg_get_constraintdef(con.oid, true)
  )
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = '$SCHEMA'

  UNION ALL

  SELECT format(
    'INDEX|%I.%I|%I|%s',
    n.nspname,
    t.relname,
    i.relname,
    pg_get_indexdef(idx.indexrelid, 0, true)
  )
  FROM pg_index idx
  JOIN pg_class i ON i.oid = idx.indexrelid
  JOIN pg_class t ON t.oid = idx.indrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = '$SCHEMA'

  UNION ALL

  SELECT format(
    'VIEWDEF|%I.%I|%s',
    n.nspname,
    c.relname,
    md5(pg_get_viewdef(c.oid, true))
  )
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = '$SCHEMA'
    AND c.relkind IN ('v', 'm')

  UNION ALL

  SELECT format(
    'FUNCTION|%I.%I(%s)|%s',
    n.nspname,
    p.proname,
    pg_get_function_identity_arguments(p.oid),
    md5(pg_get_functiondef(p.oid))
  )
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = '$SCHEMA'

  UNION ALL

  SELECT format(
    'TRIGGER|%I.%I|%I|%s',
    n.nspname,
    c.relname,
    t.tgname,
    md5(pg_get_triggerdef(t.oid, true))
  )
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = '$SCHEMA'
    AND NOT t.tgisinternal

  UNION ALL

  SELECT format(
    'POLICY|%I.%I|%I|%s|%s|%s|%s',
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    COALESCE(qual, ''),
    COALESCE(with_check, '')
  )
  FROM pg_policies
  WHERE schemaname = '$SCHEMA'

  UNION ALL

  SELECT format(
    'RLS|%I.%I|%s|%s',
    n.nspname,
    c.relname,
    c.relrowsecurity,
    c.relforcerowsecurity
  )
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = '$SCHEMA'
    AND c.relkind IN ('r', 'p')

  UNION ALL

  SELECT format(
    'SEQUENCE|%I.%I|%s|%s|%s|%s|%s|%s|%s',
    s.schemaname,
    s.sequencename,
    COALESCE(s.data_type::text, ''),
    s.start_value,
    s.min_value,
    s.max_value,
    s.increment_by,
    s.cycle,
    s.cache_size
  )
  FROM pg_sequences s
  WHERE s.schemaname = '$SCHEMA'

  UNION ALL

  SELECT format(
    'ENUM|%I.%I|%s',
    n.nspname,
    t.typname,
    string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder)
  )
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  JOIN pg_enum e ON e.enumtypid = t.oid
  WHERE n.nspname = '$SCHEMA'
  GROUP BY n.nspname, t.typname
)
SELECT line
FROM lines
ORDER BY line;
SQL
)

psql "$DATABASE_URL_INPUT" -v ON_ERROR_STOP=1 -At -P pager=off -c "$SQL_QUERY" > "$TMP_FINGERPRINT"

CURRENT_HASH="$(sha256sum "$TMP_FINGERPRINT" | awk '{print $1}')"

if [[ "$UPDATE_MODE" -eq 1 ]]; then
  mkdir -p "$(dirname "$HASH_FILE")" "$(dirname "$FINGERPRINT_FILE")"
  cp "$TMP_FINGERPRINT" "$FINGERPRINT_FILE"
  printf '%s\n' "$CURRENT_HASH" > "$HASH_FILE"
  echo "[schema-drift] baseline updated"
  echo "  schema: $SCHEMA"
  echo "  hash:   $CURRENT_HASH"
  echo "  files:  $HASH_FILE, $FINGERPRINT_FILE"
  exit 0
fi

if [[ ! -f "$HASH_FILE" ]]; then
  echo "[schema-drift] Missing hash baseline file: $HASH_FILE" >&2
  echo "[schema-drift] Run: bash scripts/diagnostics/check-schema-drift.sh --update" >&2
  exit 1
fi

EXPECTED_HASH="$(head -n 1 "$HASH_FILE" | awk '{print $1}')"

if [[ "$CURRENT_HASH" != "$EXPECTED_HASH" ]]; then
  echo "[schema-drift] DRIFT DETECTED for schema=$SCHEMA" >&2
  echo "  expected: $EXPECTED_HASH" >&2
  echo "  current:  $CURRENT_HASH" >&2

  if [[ -f "$FINGERPRINT_FILE" ]]; then
    if ! diff -u "$FINGERPRINT_FILE" "$TMP_FINGERPRINT" > "$TMP_DIFF"; then
      echo >&2
      echo "[schema-drift] fingerprint diff (first 120 lines):" >&2
      sed -n '1,120p' "$TMP_DIFF" >&2
    fi
  else
    echo "[schema-drift] Missing fingerprint baseline file: $FINGERPRINT_FILE" >&2
  fi

  echo >&2
  echo "[schema-drift] If drift is expected, regenerate baseline:" >&2
  echo "  bash scripts/diagnostics/check-schema-drift.sh --update" >&2
  exit 1
fi

echo "[schema-drift] OK schema=$SCHEMA hash=$CURRENT_HASH"
