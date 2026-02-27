#!/usr/bin/env bash
set -euo pipefail

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

psql "${DB_URL}" -v ON_ERROR_STOP=1 -P pager=off -f scripts/diagnostics/check_prelaunch_legacy_null_entities.sql
