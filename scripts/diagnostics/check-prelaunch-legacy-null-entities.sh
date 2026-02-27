#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="${SCRIPT_DIR}/check_prelaunch_legacy_null_entities.sql"

DB_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"

if [[ -z "${DB_URL}" ]] && command -v supabase >/dev/null 2>&1; then
  STATUS_RAW="$(supabase status --output json 2>&1 || true)"
  if command -v jq >/dev/null 2>&1; then
    DB_URL="$(printf '%s\n' "${STATUS_RAW}" | jq -r '.DB_URL // empty' 2>/dev/null || true)"
  fi
  if [[ -z "${DB_URL}" ]]; then
    DB_URL="$(printf '%s\n' "${STATUS_RAW}" | sed -n 's/.*"DB_URL":[[:space:]]*"\([^"]*\)".*/\1/p' | tail -n 1)"
  fi
fi

if [[ -z "${DB_URL}" ]]; then
  echo "No DB URL available. Set DATABASE_URL/SUPABASE_DB_URL or run local Supabase."
  exit 2
fi

DB_URL="$(printf '%s' "${DB_URL}" | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
if [[ "${DB_URL}" != postgres://* && "${DB_URL}" != postgresql://* ]]; then
  echo "Invalid DB URL scheme (expected postgres:// or postgresql://)." >&2
  exit 2
fi

if ! psql "${DB_URL}" -v ON_ERROR_STOP=1 -P pager=off -f "${SQL_FILE}"; then
  status=1
  redacted_url="$(printf '%s' "${DB_URL}" | sed -E 's#(postgres(ql)?://[^:/@]+:)[^@]*@#\1***@#')"
  echo "psql connection failed for DB_URL (shell-escaped, redacted):" >&2
  printf '%q\n' "${redacted_url}" >&2
  echo "DB_URL length: ${#DB_URL}" >&2
  exit "${status}"
fi
