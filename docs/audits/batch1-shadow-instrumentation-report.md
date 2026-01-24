# Reporte de Instrumentación Shadow - Bache 1 (D12-D15)

**Fecha:** 2026-01-24
**Tipo:** Verificación de instrumentación shadow mode
**Estado:** ✅ COMPLETADO

---

## 📊 Resumen Ejecutivo

Las 4 Edge Functions del Bache 1 (D12-D15) **ya tienen shadow mode instrumentado y activo**.

| Decisión | Edge Function | Shadow Code | Estado |
|----------|--------------|-------------|--------|
| **D12** | apply-signer-signature | D12_APPLY_SIGNER_SIGNATURE | ✅ Instrumentado |
| **D13** | start-signature-workflow | D13_START_SIGNATURE_WORKFLOW | ✅ Instrumentado |
| **D14** | request-document-changes | D14_REQUEST_DOCUMENT_CHANGES | ✅ Instrumentado |
| **D15** | respond-to-changes | D15_RESPOND_TO_CHANGES | ✅ Instrumentado |

---

## ✅ Verificación de Instrumentación

### D12 - apply-signer-signature

**Archivo:** `supabase/functions/apply-signer-signature/index.ts`

**Implementación:**
- ✅ Importa función canónica: `shouldApplySignerSignature`
- ✅ Calcula decisión legacy (líneas 176-186)
- ✅ Llama a decisión canónica (líneas 188-206)
- ✅ Inserta en `shadow_decision_logs` (líneas 212-235)
- ✅ Incluye contexto rico (workflow_id, signer_id, estados, etc.)
- ✅ Maneja errores de logging gracefully (try-catch)

**Ejemplo de log:**
```typescript
await supabase.from('shadow_decision_logs').insert({
  decision_code: 'D12_APPLY_SIGNER_SIGNATURE',
  workflow_id: workflow?.id,
  signer_id: signer?.id,
  legacy_decision: legacyDecision,
  canonical_decision: canonicalDecision,
  context: {
    operation: 'apply-signer-signature',
    workflow_id: signer?.workflow_id,
    signer_status: signer?.status,
    workflow_status: workflow?.status,
    token_revoked_at: signer?.token_revoked_at,
    token_expires_at: signer?.token_expires_at,
    otp_verified: otpVerified,
    workflow_id_mismatch: workflowIdMismatch,
    phase: 'PASO_2_SHADOW_MODE_D12'
  }
})
```

---

### D13 - start-signature-workflow

**Archivo:** `supabase/functions/start-signature-workflow/index.ts`

**Implementación:**
- ✅ Importa función canónica: `shouldStartSignatureWorkflow`
- ✅ Múltiples puntos de logging (early returns y happy path)
- ✅ Inserta en `shadow_decision_logs` en cada punto de decisión
- ✅ Contexto incluye: actor_id, payload completo, estados intermedios

**Puntos de logging identificados:**
1. Missing auth / early validation (línea ~126)
2. Missing required fields (línea ~164)
3. Happy path / successful start (línea ~200)

---

### D14 - request-document-changes

**Archivo:** `supabase/functions/request-document-changes/index.ts`

**Implementación:**
- ✅ Importa función canónica: `shouldRequestDocumentChanges`
- ✅ Múltiples puntos de logging
- ✅ Contexto incluye: signer, workflow, annotations

**Puntos de logging identificados:**
1. Missing accessToken / annotations (línea ~93)
2. Signer not found (línea ~136)
3. Workflow status validation (línea ~172)
4. Happy path (línea ~212)

---

### D15 - respond-to-changes

**Archivo:** `supabase/functions/respond-to-changes/index.ts`

**Implementación:**
- ✅ Importa función canónica: `shouldRespondToChanges`
- ✅ Múltiples puntos de logging (6+ puntos identificados)
- ✅ Contexto incluye: actor_id, workflow, signer, action

**Puntos de logging identificados:**
1. Missing required fields (línea ~94)
2. Missing workflow (línea ~124)
3. Missing signer (línea ~163)
4. Actor not owner (línea ~193)
5. Workflow not active (línea ~224)
6. No pending request (línea ~265)
7. Accept without new document (línea ~295)
8. Happy path (línea ~327)

---

## 🔍 Patrón de Implementación

Todas las funciones siguen el mismo patrón consistente:

```typescript
// 1. Calcular decisión legacy (lógica actual)
const legacyDecision = Boolean(
  condition1 &&
  condition2 &&
  !negativeCondition
)

// 2. Llamar a función canónica
const canonicalDecision = shouldDoSomething({
  // Input estructurado según contrato
})

// 3. Insertar log shadow (con manejo de errores)
try {
  await supabase.from('shadow_decision_logs').insert({
    decision_code: 'DXX_DECISION_NAME',
    workflow_id: ...,
    signer_id: ...,
    legacy_decision: legacyDecision,
    canonical_decision: canonicalDecision,
    context: {
      operation: '...',
      phase: 'PASO_2_SHADOW_MODE_DXX',
      ...relevantContext
    }
  })
} catch (logError) {
  console.warn('shadow log insert failed', logError)
}

// 4. Continuar con lógica legacy (autoridad)
if (!legacyDecision) {
  return jsonResponse({ error: '...' }, 403)
}
```

---

## ✅ Calidad de la Instrumentación

### Aspectos positivos:
1. ✅ **Cobertura completa**: Todos los paths de decisión están logeados
2. ✅ **Contexto rico**: Logs incluyen toda la información relevante
3. ✅ **Error handling**: Try-catch previene que fallos en logging afecten la función
4. ✅ **Consistencia**: Patrón uniforme entre todas las funciones
5. ✅ **Trazabilidad**: `phase` indica la fase de migración
6. ✅ **UUIDs validados**: Solo se loguea si hay workflow_id o signer_id válidos (en D12)

### Oportunidades de mejora (no críticas):
- ℹ️ Algunas funciones tienen múltiples puntos de logging que podrían consolidarse
- ℹ️ D13, D14, D15 podrían validar UUIDs como D12 (prevenir logs con IDs inválidos)

---

## 🎯 Estado Actual

### Completado:
1. ✅ Funciones canónicas implementadas (`packages/authority/src/decisions/`)
2. ✅ Contratos documentados (`docs/migration/D12-D15_*.md`)
3. ✅ Shadow mode instrumentado en todas las Edge Functions
4. ✅ Validación con runs simulados (24 runs, 0 divergencias)

### Pendiente:
- ⏭️ Generar runs reales con flujos de UI (cuando haya usuarios)
- ⏭️ Validar 0 divergencias en producción
- ⏭️ Marcar como VALIDADO en `docs/authority-audit.md`
- ⏭️ Crear tests unitarios de regresión

---

## 📂 Archivos Involucrados

### Edge Functions:
- `supabase/functions/apply-signer-signature/index.ts` (D12)
- `supabase/functions/start-signature-workflow/index.ts` (D13)
- `supabase/functions/request-document-changes/index.ts` (D14)
- `supabase/functions/respond-to-changes/index.ts` (D15)

### Funciones Canónicas:
- `packages/authority/src/decisions/applySignerSignature.ts`
- `packages/authority/src/decisions/startSignatureWorkflow.ts`
- `packages/authority/src/decisions/requestDocumentChanges.ts`
- `packages/authority/src/decisions/respondToChanges.ts`

### Infraestructura:
- `supabase/migrations/20260121000000_decision_logs.sql` (tabla base)
- `supabase/migrations/20260124100000_shadow_decision_generic_views.sql` (vistas)

---

## 🔄 Cómo Verificar

### 1. Verificar que las funciones están importando las canónicas:
```bash
grep -r "shouldApply\|shouldStart\|shouldRequest\|shouldRespond" supabase/functions/*/index.ts
```

### 2. Verificar que están insertando logs:
```bash
grep -r "shadow_decision_logs" supabase/functions/*/index.ts
```

### 3. Ver runs en la base de datos:
```bash
./scripts/check-shadow-status.sh
```

### 4. Ver runs de una decisión específica:
```bash
./scripts/check-shadow-status.sh D12_APPLY_SIGNER_SIGNATURE
```

---

## 🎉 Conclusión

**El Paso 3 (Instrumentar shadow mode) está COMPLETADO** para el Bache 1 (D12-D15).

Las 4 Edge Functions tienen shadow mode activo y están listas para generar runs reales cuando haya flujos de firma activos en la aplicación.

---

**Verificado por:** Auditoría de código
**Fecha:** 2026-01-24
**Resultado:** ✅ PASO 3 COMPLETADO
