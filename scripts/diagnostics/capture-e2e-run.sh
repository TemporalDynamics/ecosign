#!/usr/bin/env bash
set -euo pipefail

# Capture one real E2E run into docs/releases/e2e_evidence_runs.md
#
# Required:
#   --flow-type <DIRECT_PROTECTION|SIGNATURE_FLOW>
#   --plan <free|pro|business|enterprise|...>
#   --entity-id <uuid>
#   --verifier-status <valid|valid_intermediate|invalid|incomplete>
#
# Optional:
#   --workflow-id <uuid>
#   --notes "<text>"
#   --output <path>   (default: docs/releases/e2e_evidence_runs.md)
#
# Environment:
#   DATABASE_URL or SUPABASE_DB_URL

FLOW_TYPE=""
PLAN=""
ENTITY_ID=""
WORKFLOW_ID=""
VERIFIER_STATUS=""
NOTES=""
OUTPUT_PATH="docs/releases/e2e_evidence_runs.md"

print_usage() {
  cat <<'EOF'
Usage:
  bash scripts/diagnostics/capture-e2e-run.sh \
    --flow-type <DIRECT_PROTECTION|SIGNATURE_FLOW> \
    --plan <free|pro|business|enterprise|...> \
    --entity-id <uuid> \
    --verifier-status <valid|valid_intermediate|invalid|incomplete> \
    [--workflow-id <uuid>] \
    [--notes "<text>"] \
    [--output <path>]

Requires:
  DATABASE_URL or SUPABASE_DB_URL
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      print_usage
      exit 0
      ;;
    --flow-type)
      FLOW_TYPE="${2:-}"
      shift 2
      ;;
    --plan)
      PLAN="${2:-}"
      shift 2
      ;;
    --entity-id)
      ENTITY_ID="${2:-}"
      shift 2
      ;;
    --workflow-id)
      WORKFLOW_ID="${2:-}"
      shift 2
      ;;
    --verifier-status)
      VERIFIER_STATUS="${2:-}"
      shift 2
      ;;
    --notes)
      NOTES="${2:-}"
      shift 2
      ;;
    --output)
      OUTPUT_PATH="${2:-}"
      shift 2
      ;;
    *)
      echo "ERROR: unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

DB_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"
if [[ -z "${DB_URL}" ]]; then
  echo "ERROR: set DATABASE_URL or SUPABASE_DB_URL." >&2
  exit 2
fi

if [[ -z "${FLOW_TYPE}" || -z "${PLAN}" || -z "${ENTITY_ID}" || -z "${VERIFIER_STATUS}" ]]; then
  echo "ERROR: missing required args." >&2
  print_usage >&2
  exit 2
fi

sql_scalar() {
  local sql="$1"
  PGCONNECT_TIMEOUT=5 psql "${DB_URL}" -Atq -v ON_ERROR_STOP=1 -c "${sql}"
}

workflow_completed_present="NO"
if [[ -n "${WORKFLOW_ID}" ]]; then
  wc_count="$(sql_scalar "SELECT COUNT(*)::int FROM workflow_events WHERE workflow_id='${WORKFLOW_ID}'::uuid AND event_type='workflow.completed';")"
  if [[ "${wc_count}" != "0" ]]; then
    workflow_completed_present="YES"
  fi
else
  wc_count_entity="$(sql_scalar "SELECT COUNT(*)::int
    FROM document_entities de, jsonb_array_elements(de.events) e
    WHERE de.id='${ENTITY_ID}'::uuid
      AND COALESCE(e->>'kind', e->>'event_type', e->>'type')='workflow.completed';")"
  if [[ "${wc_count_entity}" != "0" ]]; then
    workflow_completed_present="YES"
  fi
fi

final_state="$(sql_scalar "WITH ev AS (
    SELECT COALESCE(e->>'kind', e->>'event_type', e->>'type') AS kind
    FROM document_entities de, jsonb_array_elements(de.events) e
    WHERE de.id='${ENTITY_ID}'::uuid
)
SELECT CASE
  WHEN EXISTS (SELECT 1 FROM ev WHERE kind='artifact.finalized') THEN 'final'
  WHEN EXISTS (SELECT 1 FROM ev WHERE kind='workflow.completed') THEN 'terminal'
  WHEN EXISTS (SELECT 1 FROM ev WHERE kind='eco.snapshot') THEN 'snapshot'
  ELSE 'intermediate'
END;")"

event_to_job_gap_seconds="$(sql_scalar "WITH required_event AS (
    SELECT MIN(
      COALESCE(
        NULLIF(e->>'at','')::timestamptz,
        NULLIF(e->>'created_at','')::timestamptz,
        NULLIF(e->>'timestamp','')::timestamptz
      )
    ) AS required_at
    FROM document_entities de, jsonb_array_elements(de.events) e
    WHERE de.id='${ENTITY_ID}'::uuid
      AND COALESCE(e->>'kind', e->>'event_type', e->>'type') LIKE 'job.%.required'
), first_job AS (
    SELECT MIN(created_at) AS job_at
    FROM executor_jobs
    WHERE document_entity_id='${ENTITY_ID}'::uuid
)
SELECT COALESCE(
  ROUND(EXTRACT(EPOCH FROM (first_job.job_at - required_event.required_at))::numeric, 3)::text,
  'n/a'
)
FROM required_event, first_job;")"

captured_at="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

{
  echo
  echo "## Run $(date -u +'%Y%m%d-%H%M%S')"
  echo "- captured_at: ${captured_at}"
  echo "- flow_type: ${FLOW_TYPE}"
  echo "- plan: ${PLAN}"
  echo "- entity_id: ${ENTITY_ID}"
  if [[ -n "${WORKFLOW_ID}" ]]; then
    echo "- workflow_id: ${WORKFLOW_ID}"
  else
    echo "- workflow_id: n/a"
  fi
  echo "- workflow.completed present: ${workflow_completed_present}"
  echo "- finalization_reference.final_state: ${final_state}"
  echo "- event_to_job_gap_seconds: ${event_to_job_gap_seconds}"
  echo "- verifier_status: ${VERIFIER_STATUS}"
  if [[ -n "${NOTES}" ]]; then
    echo "- notes: ${NOTES}"
  else
    echo "- notes:"
  fi
} >> "${OUTPUT_PATH}"

echo "Captured run into ${OUTPUT_PATH}"
