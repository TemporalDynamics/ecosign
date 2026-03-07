#!/usr/bin/env bash
set -euo pipefail

REPORT_PATH="${1:-docs/beta/INCIDENT_RECOVERY_DRILL_$(date -u +%F).md}"

resolve_status_json() {
  local raw
  raw="$(supabase status --output json 2>&1 || true)"
  printf '%s\n' "$raw" | awk '
    BEGIN { capture = 0 }
    /^\{/ { capture = 1 }
    capture { print }
    /^}$/ { if (capture) exit }
  '
}

resolve_db_url() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    echo "$DATABASE_URL"
    return 0
  fi

  if ! command -v supabase >/dev/null 2>&1; then
    return 1
  fi

  local status_json
  status_json="$(resolve_status_json)"
  if [[ -z "$status_json" ]]; then
    return 1
  fi

  printf '%s' "$status_json" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(s.DB_URL||'')"
}

run_step() {
  local title="$1"
  shift
  echo
  echo "=== ${title} ==="
  "$@"
}

DB_URL="$(resolve_db_url || true)"
if [[ -z "$DB_URL" ]]; then
  echo "[incident-drill] missing DATABASE_URL and local DB_URL unavailable" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "[incident-drill] psql is required" >&2
  exit 1
fi

mkdir -p "$(dirname "$REPORT_PATH")"

TMP_PROJECTION_LOG="$(mktemp)"
TMP_RUNTIME_LOG="$(mktemp)"
TMP_OBS_LOG="$(mktemp)"
TMP_DRIFT_LOG="$(mktemp)"
trap 'rm -f "$TMP_PROJECTION_LOG" "$TMP_RUNTIME_LOG" "$TMP_OBS_LOG" "$TMP_DRIFT_LOG"' EXIT

export DATABASE_URL="$DB_URL"

run_step "Projection rebuild recovery drill (transactional)" bash -lc \
  "psql \"$DATABASE_URL\" -v ON_ERROR_STOP=1 -f scripts/diagnostics/incident_recovery_projection_drill.sql > \"$TMP_PROJECTION_LOG\""
cat "$TMP_PROJECTION_LOG"

run_step "Post-incident runtime verification (canonical smoke)" bash -o pipefail -lc \
  "npm run baseline:runtime | tee \"$TMP_RUNTIME_LOG\""

run_step "Post-incident invariant observability verification" bash -o pipefail -lc \
  "npm run diag:invariant-observability | tee \"$TMP_OBS_LOG\""

run_step "Post-incident schema drift verification" bash -o pipefail -lc \
  "npm run diag:schema-drift | tee \"$TMP_DRIFT_LOG\""

PROJECTION_RESULT="PASSED"

{
  echo "# Incident Recovery Drill"
  echo
  echo "- Generated at (UTC): $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "- Drill type: projection/evidence recovery + post-incident verification"
  echo "- DB target: ${DB_URL}"
  echo
  echo "## Result Summary"
  echo
  echo "- Projection rebuild transactional drill: ${PROJECTION_RESULT}"
  echo "- Runtime canonical post-check: PASS"
  echo "- Invariant observability post-check: PASS"
  echo "- Schema drift post-check: PASS"
  echo
  echo "## Projection Drill Excerpt"
  echo
  echo '```text'
  grep -E 'Final verdict|INCIDENT PROJECTION DRILL' "$TMP_PROJECTION_LOG" || true
  echo '```'
  echo
  echo "## Runtime Verification Excerpt"
  echo
  echo '```text'
  grep -E 'Baseline runtime canonical smoke|Runtime baseline snapshot written|FAIL|PASSED|PASS' "$TMP_RUNTIME_LOG" || true
  echo '```'
  echo
  echo "## Invariant Observability Excerpt"
  echo
  echo '```text'
  tail -n 20 "$TMP_OBS_LOG"
  echo '```'
  echo
  echo "## Schema Drift Excerpt"
  echo
  echo '```text'
  cat "$TMP_DRIFT_LOG"
  echo '```'
} > "$REPORT_PATH"

echo
echo "✅ Incident recovery drill completed."
echo "Report: $REPORT_PATH"
