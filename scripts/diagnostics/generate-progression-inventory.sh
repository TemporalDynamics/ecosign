#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
  echo "error: ripgrep (rg) is required" >&2
  exit 1
fi

NOW_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
OUT_DIR="docs/reports/canonical-convergence"
OUT_FILE="$OUT_DIR/progression-inventory-$STAMP.md"
mkdir -p "$OUT_DIR"

append_section() {
  local title="$1"
  local cmd="$2"
  {
    echo "## $title"
    echo
    echo '```'
    bash -lc "$cmd" || true
    echo '```'
    echo
  } >> "$OUT_FILE"
}

cat > "$OUT_FILE" <<EOF2
# Progression Inventory Snapshot

Generated at: $NOW_UTC

Purpose: list active progression engines and authority leaks (Fase 1).

EOF2

append_section \
  "A. Triggers definidos en migraciones" \
  "rg -n \"create trigger|CREATE TRIGGER\" supabase/migrations | sed -n '1,220p'"

append_section \
  "B. Triggers/listeners que encolan jobs" \
  "rg -n \"enqueue_executor_job|create_or_requeue_job|insert into executor_jobs|INSERT INTO executor_jobs|claim_initial_decision_jobs|claim_orchestrator_jobs\" supabase/migrations supabase/functions | sed -n '1,260p'"

append_section \
  "C. Feature flags que afectan ejecucion" \
  "rg -n \"isDecisionUnderCanonicalAuthority|ENABLE_D[0-9]_CANONICAL|D[0-9]_[A-Z_]+ENABLED|flagSync\" supabase/functions | sed -n '1,260p'"

append_section \
  "D. Requeue/retry/timeout en runtime" \
  "rg -n \"requeue|retry_scheduled|dead|timeout|claim_\" supabase/functions/fase1-executor/index.ts supabase/functions/orchestrator/index.ts | sed -n '1,260p'"

append_section \
  "E. Paths legacy vivos (functions + cron)" \
  "rg --files supabase/functions/_legacy supabase/functions | rg \"_legacy|process-polygon-anchors|process-bitcoin-anchors|wake-authority\" | sed -n '1,260p'"

append_section \
  "F. Posibles decisiones fuera del decision engine" \
  "rg -n \"enqueueExecutorJob\(|protectDocumentV2|decide|derive|next job|next action\" supabase/functions | rg -v \"decisionEngineCanonical.ts|protectDocumentV2Decision.ts|protectDocumentV2PipelineDecision.ts\" | sed -n '1,260p'"

cat >> "$OUT_FILE" <<'EOF2'
## Resumen automatico

Este reporte no infiere semantica completa: muestra candidatos de autoridad/progresion para inspeccion.

Uso recomendado:
1. Revisar secciones B, C, D, F.
2. Clasificar cada hallazgo como: `canonical`, `operational`, `legacy`.
3. Abrir ticket por cada item no canonical que altere progresion.
EOF2

echo "generated: $OUT_FILE"
