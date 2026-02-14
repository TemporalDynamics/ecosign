#!/usr/bin/env bash
set -euo pipefail

# Local, static EPI invariant checks (no DB required).
# Fails fast with non-zero exit code if any invariant drifts.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PASS_COUNT=0
FAIL_COUNT=0

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  echo "✅ $1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo "❌ $1"
}

check_pattern() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if rg -n --fixed-strings "$pattern" "$file" >/dev/null 2>&1; then
    pass "$label"
  else
    fail "$label"
  fi
}

check_absent() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if rg -n --fixed-strings "$pattern" "$file" >/dev/null 2>&1; then
    fail "$label"
  else
    pass "$label"
  fi
}

echo "🔍 Verificación local REAL de invariantes EPI (sin conexión a DB)"
echo

APPLY_FILE="supabase/functions/apply-signer-signature/index.ts"
MIGRATION_UNIQ_FILE="supabase/migrations/20260115100000_add_notification_step_and_unique_constraint.sql"

if [[ ! -f "$APPLY_FILE" ]]; then
  echo "❌ Archivo requerido no encontrado: $APPLY_FILE"
  exit 1
fi

if [[ ! -f "$MIGRATION_UNIQ_FILE" ]]; then
  echo "❌ Archivo requerido no encontrado: $MIGRATION_UNIQ_FILE"
  exit 1
fi

echo "1) Fail-hard de witness immutable en apply-signer-signature"
check_pattern "$APPLY_FILE" "EPI_IMMUTABLE_UPLOAD_FAILED" "Existe error_code EPI_IMMUTABLE_UPLOAD_FAILED"
check_pattern "$APPLY_FILE" "witness_current_storage_path: signedPdfPath" "witness_current_storage_path se actualiza al path firmado"
check_pattern "$APPLY_FILE" "FAIL HARD: No fallback to mutable path" "Marcado explícito de política fail-hard"
check_absent "$APPLY_FILE" "witness_current_storage_path: workflow.document_path" "No hay fallback mutable explícito a workflow.document_path"
echo

echo "2) Contrato de error estructurado"
check_pattern "$APPLY_FILE" "error_code: 'EPI_WITNESS_UPDATE_FAILED'" "Existe error_code EPI_WITNESS_UPDATE_FAILED"
check_pattern "$APPLY_FILE" "retryable: true" "Errores críticos de EPI son retryables donde corresponde"
check_pattern "client/src/pages/SignWorkflowPage.tsx" "body?.error_code" "Frontend consume error_code estructurado"
echo

echo "3) Idempotencia de notificaciones en DB (nivel contrato)"
check_pattern "$MIGRATION_UNIQ_FILE" "unq_workflow_signer_notification_step" "Existe constraint único por workflow/signer/type/step"
check_pattern "$MIGRATION_UNIQ_FILE" "workflow_id, signer_id, notification_type, step" "Constraint cubre llave idempotente esperada"
echo

echo "4) Modelo EPI de artefacto inmutable signed/"
check_pattern "$APPLY_FILE" 'signed/${workflow.id}/${signer.id}/${hashHex}.pdf' "Path firmado canónico con signed/{workflow}/{signer}/{hash}.pdf"
check_pattern "docs/contracts/AUTHORITY_FREEZE_PRECANARY.md" "witness_current_storage_path" "Contrato freeze documenta puntero canónico"
echo

echo "5) Guardrails canónicos siguen presentes"
check_pattern "verify_epi_invariants.sh" "violations.non_signed_witness_path" "Script DB de invariantes sigue chequeando non_signed_witness_path"
check_pattern "scripts/db/verify_precanary_epi.sql" "workflow_notifications" "SQL pre-canary mantiene chequeo de duplicados de notificación"
echo

echo "Resumen:"
echo "  Passed: $PASS_COUNT"
echo "  Failed: $FAIL_COUNT"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  echo
  echo "❌ Verificación local EPI FALLÓ"
  exit 1
fi

echo
echo "🎉 Verificación local EPI PASSED"
