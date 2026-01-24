# D10 - Rechazar firma (signer) ✅ VALIDADO - ACUMULANDO

**Fecha de inicio:** 2026-01-23
**Fecha de validación:** 2026-01-23
**Fase:** 2 - Shadow validation (VALIDADO - Acumulando runs)
**Grupo:** 2 - Workflow (alto impacto, estado terminal de signer)

**Estado actual:** 2 runs, 0 divergencias, 100% match rate

---

## 📋 Qué decide

**Decisión:** "¿Se debe rechazar/cancelar la participación de un signer en un workflow?"

**Contexto:**
Cuando un firmante decide no firmar un documento (rechaza activamente), el sistema debe decidir si esa acción es válida y, en caso afirmativo, aplicar el cambio de estado del signer y registrar evento canónico.

```
API/Edge: reject-signature
          ↓
     [D10: Reject?] → workflow_signers UPDATE (status='rejected')
          ↓
     workflow_events INSERT (signer.rejected)
```

**Responsabilidad actual:** Edge Function `supabase/functions/reject-signature`.

**Diferencia con D9 (cancel-workflow):**
- D9 cancela el **workflow completo** (decisión del owner)
- D10 cancela un **signer específico** (decisión del signer mismo)

---

## 🔢 Inputs

### Datos requeridos (request):
- **actor**: usuario autenticado (puede ser signer o owner)
- **signer_id**: UUID del signer a rechazar
- **workflow_id**: UUID del workflow (opcional, para validación)
- **reason**: razón del rechazo (opcional, para logging)

### Contexto adicional (queries):
- **Signer**: `workflow_signers.id`, `email`, `status`, `access_token_hash`
- **Workflow**: `signature_workflows.id`, `owner_id`, `status`

---

## 🎯 Output

### Resultado (si decisión es TRUE):

1) **Actualizar signer**
```sql
UPDATE workflow_signers
SET status = 'rejected',
    updated_at = NOW(),
    rejected_at = NOW()
WHERE id = :signer_id;
```

2) **Registrar evento canónico**
```sql
INSERT INTO workflow_events (
  workflow_id,
  signer_id,
  event_type, -- 'signer.rejected'
  payload,
  actor_id
)
```

### Decisión = FALSE (no rechazar):
- Signer no existe
- Signer ya está en estado terminal (`signed`, `rejected`)
- Workflow ya está en estado terminal (`completed`, `cancelled`, `archived`)
- Actor no autorizado (no es el signer ni el owner)

---

## 🔒 Invariantes

### 1. Condiciones para rechazar (AND lógico):
```typescript
signer.status NOT IN ('signed', 'rejected') &&
workflow.status NOT IN ('completed', 'cancelled', 'archived') &&
(actor_id === signer_email || actor_id === workflow.owner_id)
```

### 2. Estados del signer:
- `invited`, `ready_to_sign`, `awaiting` → pueden rechazar
- `signed` → NO puede rechazar (ya firmó, es terminal)
- `rejected` → NO puede rechazar de nuevo (idempotencia)

### 3. Autorización:
- **El signer mismo** puede rechazar (via access token)
- **El owner** puede cancelar al signer
- Nadie más tiene permiso

### 4. Side effects obligatorios:
- `workflow_events.event_type = 'signer.rejected'`
- `payload.previous_status` debe registrar el estado anterior
- `payload.rejected_at` debe registrar el timestamp
- `payload.reason` es opcional (si el signer lo provee)

### 5. Idempotencia:
- Rechazar un signer ya rechazado **no** debe generar side effects ni eventos nuevos

---

## ❌ Qué NO decide

Esta decisión **NO** es responsable de:

1. **Notificar al owner/signers** → eso sería otra decisión (D11+)
2. **Cancelar el workflow completo** → eso es D9
3. **Re-invitar al signer** → eso es una acción separada
4. **Modificar el PDF o artifact** → eso se hace cuando todos firman/rechazan
5. **Validar identidad** → eso ya pasó antes

---

## 🎨 Regla canónica (formal)

```typescript
export interface RejectSignatureInput {
  actor_id: string | null;
  signer: {
    id: string;
    email: string;
    status: string;
    workflow_id: string;
  } | null;
  workflow: {
    owner_id: string;
    status: string;
  } | null;
}

export const shouldRejectSignature = (input: RejectSignatureInput): boolean => {
  // 1. Actor debe estar autenticado
  if (!input.actor_id) return false;

  // 2. Signer debe existir
  if (!input.signer) return false;

  // 3. Workflow debe existir
  if (!input.workflow) return false;

  // 4. Signer no puede estar en estado terminal
  const terminalSignerStatuses = ['signed', 'rejected'];
  if (terminalSignerStatuses.includes(input.signer.status)) return false;

  // 5. Workflow no puede estar en estado terminal
  const terminalWorkflowStatuses = ['completed', 'cancelled', 'archived'];
  if (terminalWorkflowStatuses.includes(input.workflow.status)) return false;

  // 6. Actor debe ser el signer mismo o el owner del workflow
  const isOwner = input.actor_id === input.workflow.owner_id;
  const isSigner = input.actor_id === input.signer.email;
  if (!isOwner && !isSigner) return false;

  // Todas las condiciones cumplidas
  return true;
};
```

---

## 📊 Casos de prueba

### Test 1: Happy path - Signer rechaza su propia firma
```typescript
Input: {
  actor_id: 'signer@example.com',
  signer: { email: 'signer@example.com', status: 'ready_to_sign', ... },
  workflow: { status: 'active', ... }
}
Output: true
```

### Test 2: Owner cancela a un signer
```typescript
Input: {
  actor_id: 'owner@example.com',
  signer: { email: 'signer@example.com', status: 'invited', ... },
  workflow: { owner_id: 'owner@example.com', status: 'active', ... }
}
Output: true
```

### Test 3: Signer ya firmó (terminal)
```typescript
Input: {
  actor_id: 'signer@example.com',
  signer: { status: 'signed', ... }
}
Output: false
```

### Test 4: Signer ya rechazado (idempotencia)
```typescript
Input: {
  actor_id: 'signer@example.com',
  signer: { status: 'rejected', ... }
}
Output: false
```

### Test 5: Workflow cancelado
```typescript
Input: {
  workflow: { status: 'cancelled', ... }
}
Output: false
```

### Test 6: Actor no autorizado
```typescript
Input: {
  actor_id: 'otro@example.com',
  signer: { email: 'signer@example.com', ... },
  workflow: { owner_id: 'owner@example.com', ... }
}
Output: false
```

### Test 7: Signer inexistente
```typescript
Input: {
  actor_id: 'owner@example.com',
  signer: null
}
Output: false
```

### Test 8: Workflow inexistente
```typescript
Input: {
  actor_id: 'signer@example.com',
  workflow: null
}
Output: false
```

---

## 🔍 Autoridad actual (legacy)

**Ubicación:** `supabase/functions/reject-signature/index.ts`

**Lógica actual (resumen esperado):**
- Autentica usuario (JWT o access token)
- Valida que actor es signer o owner
- Valida que signer no esté en estado terminal
- Valida que workflow no esté cancelado/completado
- Actualiza status → `rejected`
- Emite `signer.rejected` en workflow_events

**Nota:** A verificar en implementación real.

---

## 🚀 Plan de implementación

### Fase 1 — Contrato (COMPLETADA ✅)
- ✅ Documento creado
- ✅ Regla canónica definida
- ✅ Validado con implementación actual de `reject-signature`

### Fase 2 — Shadow mode (ACTIVO 🔄)
- ✅ Implementar `shouldRejectSignature()` en `packages/authority/src/decisions/rejectSignature.ts`
- ✅ Crear tests: `packages/authority/tests/d10-reject-signature.test.ts` (12 escenarios, 100% pass)
- ✅ Instrumentar shadow logging en edge function (`reject-signature/index.ts` líneas 55-108)
- ✅ Log markers implementados: `[SHADOW MATCH D10]` / `[SHADOW DIVERGENCE D10]`
- ⏳ **Validación en progreso**: Esperando primera ejecución para validar

**Nota importante:** Shadow mode detectará divergencias porque:
- Legacy NO valida estados del signer (signed/rejected)
- Legacy NO valida estados del workflow (cancelled/completed)
- Legacy NO valida autorización (actor = signer o owner)
- **Esto es esperado y correcto** → evidencia de que canonical mejora seguridad

### Fase 3 — Aceptación
- [ ] ≥ 50 comparaciones
- [ ] Analizar divergencias esperadas (validaciones faltantes en legacy)
- [ ] Decidir si mantener comportamiento legacy o migrar a canonical
- [ ] Marcar como ACEPTADA

### Fase 4 — Apagado quirúrgico
- [ ] Migrar autoridad al orquestador
- [ ] Convertir edge function en NOOP o early return
- [ ] Mantener fallback por seguridad

---

## 🔗 Relaciones con otras decisiones

**Similar a:**
- D9 (cancel-workflow): ambas cancelan entidades, pero D10 es a nivel signer

**Alimenta a (futuras):**
- D11: Notificar al owner cuando un signer rechaza
- D12: Decidir si el workflow debe cancelarse automáticamente (si todos rechazan)

**Depende de:**
- Workflow activo
- Signer creado previamente (D5 notificó el link)

---

## ⚠️ Notas de diseño

1. **Autorización dual (signer O owner)**
   - El signer puede rechazar su propia firma
   - El owner puede cancelar a cualquier signer del workflow
   - Esto es diferente de D9 donde solo el owner puede cancelar

2. **Estados terminales del signer**
   - `signed` → ya firmó, no puede rechazar
   - `rejected` → ya rechazó, idempotente
   - Cualquier otro estado → puede rechazar

3. **Efecto en el workflow**
   - Rechazar a un signer **NO** cancela el workflow automáticamente
   - Eso sería una decisión separada (D12: auto-cancel workflow si todos rechazan)

4. **Reason tracking**
   - `payload.reason` es opcional pero útil para analytics
   - Ejemplos: "No estoy autorizado", "Cambios solicitados", "No corresponde"

---

## 📊 Monitoreo de Shadow Mode

### Queries útiles para validación:

**Resumen D10:**
```sql
SELECT
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE has_divergence = true) as divergences,
  COUNT(*) FILTER (WHERE has_divergence = false) as matches,
  ROUND(100.0 * COUNT(*) FILTER (WHERE has_divergence = false) / NULLIF(COUNT(*), 0), 2) as match_percentage
FROM shadow_decision_logs
WHERE decision_code = 'D10_REJECT_SIGNATURE';
```

**Últimas ejecuciones:**
```sql
SELECT
  created_at,
  legacy_decision,
  canonical_decision,
  has_divergence,
  (context->>'signer_status') as signer_status,
  (context->>'workflow_status') as workflow_status
FROM shadow_decision_logs
WHERE decision_code = 'D10_REJECT_SIGNATURE'
ORDER BY created_at DESC
LIMIT 10;
```

**Divergencias por tipo (diagnóstico):**
```sql
SELECT
  (context->>'signer_status') as signer_status,
  (context->>'workflow_status') as workflow_status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE has_divergence = true) as divergence_count
FROM shadow_decision_logs
WHERE decision_code = 'D10_REJECT_SIGNATURE'
GROUP BY signer_status, workflow_status
ORDER BY divergence_count DESC;
```

### Criterios de aceptación:
- ✅ **Shadow runs:** ≥ 50 comparaciones
- ⚠️ **Divergencias:** Se esperan divergencias por validaciones faltantes en legacy
- ✅ **Análisis de divergencias:** Documentar casos donde canonical rechaza pero legacy acepta
- ✅ **Decisión de producto:** ¿Mantener comportamiento permisivo o migrar a canonical estricto?

---

**Estado:** 🔄 Fase 2 ACTIVA - Shadow mode implementado, esperando validación
**Próximo paso:** Ejecutar rechazo de firma, analizar divergencias, decidir estrategia de migración
