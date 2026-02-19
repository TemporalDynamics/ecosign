#!/usr/bin/env bash
set -euo pipefail

# Real verification script for EPI invariants.
# Usage:
#   DATABASE_URL='postgres://...' ./verify_epi_invariants.sh
# or
#   SUPABASE_DB_URL='postgres://...' ./verify_epi_invariants.sh
# Optional:
#   EPI_FREEZE_SINCE='2026-02-19T00:00:00Z' ./verify_epi_invariants.sh
#   EPI_STRICT_HISTORICAL=1 ./verify_epi_invariants.sh

DB_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"
FREEZE_SINCE="${EPI_FREEZE_SINCE:-2026-02-19T00:00:00Z}"
STRICT_HISTORICAL="${EPI_STRICT_HISTORICAL:-0}"
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
echo "freeze_since=${FREEZE_SINCE}"

q1_post_freeze="SELECT COUNT(*)::int
    FROM signature_workflows sw
    LEFT JOIN document_entities de ON de.id = sw.document_entity_id
    WHERE sw.status = 'completed'
      AND sw.completed_at >= '${FREEZE_SINCE}'
      AND (
        sw.document_entity_id IS NULL
        OR de.witness_current_storage_path IS NULL
        OR de.witness_current_storage_path NOT LIKE 'signed/%'
      );"

q2_post_freeze="SELECT COUNT(*)::int
    FROM workflow_events we
    JOIN signature_workflows sw ON sw.id = we.workflow_id
    LEFT JOIN document_entities de ON de.id = sw.document_entity_id
    WHERE we.event_type = 'workflow.completed'
      AND we.created_at >= '${FREEZE_SINCE}'
      AND (
        sw.document_entity_id IS NULL
        OR
        de.witness_current_storage_path IS NULL
        OR de.witness_current_storage_path NOT LIKE 'signed/%'
      );"

q1_historical="SELECT COUNT(*)::int
    FROM signature_workflows sw
    LEFT JOIN document_entities de ON de.id = sw.document_entity_id
    WHERE sw.status = 'completed'
      AND (
        sw.document_entity_id IS NULL
        OR de.witness_current_storage_path IS NULL
        OR de.witness_current_storage_path NOT LIKE 'signed/%'
      );"

q2_historical="SELECT COUNT(*)::int
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

viol_1_post_freeze="$(run_psql "${q1_post_freeze}")"
viol_2_post_freeze="$(run_psql "${q2_post_freeze}")"
viol_1_historical="$(run_psql "${q1_historical}")"
viol_2_historical="$(run_psql "${q2_historical}")"

echo "hard_gate.post_freeze.non_signed_witness_path=${viol_1_post_freeze}"
echo "hard_gate.post_freeze.completed_without_immutable_witness=${viol_2_post_freeze}"
echo "debt.historical.non_signed_witness_path=${viol_1_historical}"
echo "debt.historical.completed_without_immutable_witness=${viol_2_historical}"

if [[ "${viol_1_post_freeze}" != "0" || "${viol_2_post_freeze}" != "0" ]]; then
  echo "EPI invariant check FAILED." >&2
  exit 1
fi

if [[ "${STRICT_HISTORICAL}" == "1" ]] && [[ "${viol_1_historical}" != "0" || "${viol_2_historical}" != "0" ]]; then
  echo "EPI invariant check FAILED (STRICT_HISTORICAL=1)." >&2
  exit 1
fi

echo "EPI invariant check PASSED."
