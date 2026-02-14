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

echo "Checking EPI invariants..."

q1="SELECT COUNT(*)::int
    FROM document_entities
    WHERE witness_current_storage_path IS NOT NULL
      AND witness_current_storage_path NOT LIKE 'signed/%';"

q2="SELECT COUNT(*)::int
    FROM workflow_events we
    JOIN document_entities de ON de.id = we.document_entity_id
    WHERE we.event_type = 'workflow.completed'
      AND (
        de.witness_current_storage_path IS NULL
        OR de.witness_current_storage_path NOT LIKE 'signed/%'
      );"

viol_1="$(psql "${DB_URL}" -Atqc "${q1}")"
viol_2="$(psql "${DB_URL}" -Atqc "${q2}")"

echo "violations.non_signed_witness_path=${viol_1}"
echo "violations.completed_without_immutable_witness=${viol_2}"

if [[ "${viol_1}" != "0" || "${viol_2}" != "0" ]]; then
  echo "EPI invariant check FAILED." >&2
  exit 1
fi

echo "EPI invariant check PASSED."
