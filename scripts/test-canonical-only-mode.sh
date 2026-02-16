#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DB_URL="${STAGING_DATABASE_URL:-${DATABASE_URL:-}}"
TRIGGER_NAME="on_user_documents_blockchain_anchoring"
TABLE_NAME="user_documents"
RESTORE_NEEDED=0

if [ -z "$DB_URL" ]; then
  echo "error: set STAGING_DATABASE_URL (preferred) or DATABASE_URL" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "error: psql is required" >&2
  exit 1
fi

restore_trigger() {
  if [ "$RESTORE_NEEDED" -eq 1 ]; then
    echo "restoring legacy trigger ${TRIGGER_NAME}..."
    psql "$DB_URL" -v ON_ERROR_STOP=1 -c \
      "ALTER TABLE public.${TABLE_NAME} ENABLE TRIGGER ${TRIGGER_NAME};" >/dev/null
  fi
}

trap restore_trigger EXIT

echo "canonical-only mode test at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo

echo "1) disabling legacy trigger ${TRIGGER_NAME}..."
psql "$DB_URL" -v ON_ERROR_STOP=1 -c \
  "ALTER TABLE public.${TABLE_NAME} DISABLE TRIGGER ${TRIGGER_NAME};" >/dev/null
RESTORE_NEEDED=1
echo "[PASS] legacy trigger disabled for test window"

echo
echo "2) verifying runtime cron inventory..."
DATABASE_URL="$DB_URL" ./scripts/verify-cron-inventory.sh

echo
echo "3) running canonical pipeline tests..."
npm run test:canonical-e2e
npm run test:event-reconstruction

echo
echo "[PASS] canonical-only proof complete"
