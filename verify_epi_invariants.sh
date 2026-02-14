#!/usr/bin/env bash
set -euo pipefail

# Real verification script for EPI invariants.
# Usage:
#   DATABASE_URL='postgres://...' ./verify_epi_invariants.sh
# or
#   SUPABASE_DB_URL='postgres://...' ./verify_epi_invariants.sh

DB_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"
if [[ -z "${DB_URL}" ]]; then
  echo "ERROR: DATABASE_URL or SUPABASE_DB_URL is required." >&2
  exit 2
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql is not installed or not in PATH." >&2
  exit 2
fi

run_psql() {
  local sql="$1"
  local out
  if ! out="$(PGCONNECT_TIMEOUT=5 psql "${DB_URL}" -Atq -v ON_ERROR_STOP=1 -c "${sql}" 2>&1)"; then
    echo "ERROR: database connection/query failed." >&2
    if [[ -n "${out}" ]]; then
      echo "${out}" >&2
    fi
    if [[ "${out}" == *"column "* && "${out}" == *" does not exist"* ]]; then
      echo "Hint: schema drift detected. A verification query references a removed/renamed column." >&2
      exit 2
    fi
    if [[ "${DB_URL}" == *"127.0.0.1:54322"* || "${DB_URL}" == *"localhost:54322"* ]]; then
      echo "Hint: local Supabase DB is likely down. Run 'supabase start' from repo root." >&2
    fi
    exit 2
  fi
  echo "${out}"
}

echo "Checking EPI invariants..."

q1="SELECT COUNT(*)::int
    FROM signature_workflows sw
    LEFT JOIN document_entities de ON de.id = sw.document_entity_id
    WHERE sw.status = 'completed'
      AND (
        sw.document_entity_id IS NULL
        OR de.witness_current_storage_path IS NULL
        OR de.witness_current_storage_path NOT LIKE 'signed/%'
      );"

q2="SELECT COUNT(*)::int
    FROM workflow_events we
    JOIN signature_workflows sw ON sw.id = we.workflow_id
    LEFT JOIN document_entities de ON de.id = sw.document_entity_id
    WHERE we.event_type = 'workflow.completed'
      AND (
        sw.document_entity_id IS NULL
        OR
        de.witness_current_storage_path IS NULL
        OR de.witness_current_storage_path NOT LIKE 'signed/%'
      );"

viol_1="$(run_psql "${q1}")"
viol_2="$(run_psql "${q2}")"

echo "violations.non_signed_witness_path=${viol_1}"
echo "violations.completed_without_immutable_witness=${viol_2}"

if [[ "${viol_1}" != "0" || "${viol_2}" != "0" ]]; then
  echo "EPI invariant check FAILED." >&2
  exit 1
fi

echo "EPI invariant check PASSED."
