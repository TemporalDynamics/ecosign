#!/usr/bin/env bash
set -euo pipefail

DB_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"

if [[ -z "${DB_URL}" ]]; then
  if command -v supabase >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
    DB_URL="$(supabase status --output json 2>/dev/null | jq -r '.DB_URL // empty' || true)"
  fi
fi

if [[ -z "${DB_URL}" ]]; then
  echo "ERROR: set DATABASE_URL or SUPABASE_DB_URL (or run local supabase with jq installed)." >&2
  exit 2
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql is not installed or not in PATH." >&2
  exit 2
fi

psql "${DB_URL}" -v ON_ERROR_STOP=1 -f scripts/diagnostics/smoke_user_documents_freeze.sql
