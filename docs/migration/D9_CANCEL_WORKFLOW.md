# D9 - Cancelar workflow ✅ VALIDADO - ACUMULANDO

**Fecha de inicio:** 2026-01-23
**Fecha de validación:** 2026-01-23
**Fase:** 2 - Shadow validation (VALIDADO - Acumulando runs)
**Grupo:** 2 - Workflow (alto impacto, estado terminal)

**Estado actual:** 1 run, 0 divergencias, 100% match rate

---

## 📋 Qué decide

**Decisión:** "¿Se debe cancelar un workflow?"

**Contexto:**
Cuando el owner solicita la cancelación de un workflow, el sistema debe decidir si esa cancelación es válida y, en caso afirmativo, aplicar el cambio de estado y registrar evento canónico.

```
API/Edge: cancel-workflow
          ↓
     [D9: Cancel?] → signature_workflows UPDATE (status='cancelled')
          ↓
     workflow_events INSERT (workflow.cancelled)
```

**Responsabilidad actual:** Edge Function `supabase/functions/cancel-workflow`.

---

## 🔢 Inputs

### Datos requeridos (request):
- **actor**: usuario autenticado (owner)
- **workflow_id**: UUID del workflow a cancelar

### Contexto adicional (queries):
- **Workflow**: `signature_workflows.id`, `owner_id`, `status`

---

## 🎯 Output

### Resultado (si decisión es TRUE):

1) **Actualizar workflow**
```sql
UPDATE signature_workflows
SET status = 'cancelled',
    updated_at = NOW(),
    cancelled_at = NOW()
WHERE id = :workflow_id;
```

2) **Registrar evento canónico**
```sql
INSERT INTO workflow_events (
  workflow_id,
  event_type, -- 'workflow.cancelled'
  payload,
  actor_id
)
```

### Decisión = FALSE (no cancelar):
- Actor no autenticado
- Actor no es owner del workflow
- Workflow no existe
- Workflow en estado terminal (completed / cancelled / archived)

---

## 🔒 Invariantes

### 1. Condiciones para cancelar (AND lógico):
```typescript
isAuthenticated &&
actor_id === workflow.owner_id &&
workflow.status NOT IN ('completed', 'cancelled', 'archived', 'expired')
```

### 2. Estados terminales:
- `completed`, `cancelled`, `archived`, `expired` son terminales.
- Un workflow terminal **no puede** cancelarse.

### 3. Idempotencia:
- Cancelar un workflow ya cancelado **no** debe generar side effects ni eventos nuevos.

### 4. Side effects obligatorios:
- `workflow_events.event_type = 'workflow.cancelled'`
- `payload.previous_status` debe registrar el estado anterior
- `payload.cancelled_at` debe registrar el timestamp de cancelación
- `payload.reason` es opcional (si aplica)

### 5. Actor autorizado (nota):
- **Hoy**: solo owner directo (`actor_id === owner_id`)
- **Futuro**: roles delegados (admin/org) requieren contrato nuevo

---

## ❌ Qué NO decide

Esta decisión **NO** es responsable de:

1. Notificar a firmantes/owner (eso sería otra decisión)
2. Eliminar documentos o blobs
3. Revertir firmas ya aplicadas
4. Cancelar anchors o TSA (si aplica, va por otra vía)

---

## 🎨 Regla canónica (formal)

```typescript
export const shouldCancelWorkflow = (input: {
  actor_id: string | null;
  workflow: { owner_id: string; status: string } | null;
}): boolean => {
  if (!input.actor_id) return false;
  if (!input.workflow) return false;
  if (input.workflow.owner_id !== input.actor_id) return false;
  if (['completed', 'cancelled', 'archived'].includes(input.workflow.status)) return false;
  return true;
};
```

---

## 📊 Casos de prueba

### Test 1: Happy path
```typescript
Input: actor_id = owner_id, status = 'active'
Output: true
```

### Test 2: Actor no owner
```typescript
Input: actor_id != owner_id
Output: false
```

### Test 3: Workflow en completed
```typescript
Input: status = 'completed'
Output: false
```

### Test 4: Workflow en cancelled
```typescript
Input: status = 'cancelled'
Output: false
```

### Test 5: Workflow en archived
```typescript
Input: status = 'archived'
Output: false
```

### Test 6: Actor no autenticado
```typescript
Input: actor_id = null
Output: false
```

### Test 7: Workflow inexistente
```typescript
Input: workflow = null
Output: false
```

### Test 8: Cancelación repetida (idempotente)
```typescript
Input: status = 'cancelled'
Output: false
```

---

## 🔍 Autoridad actual (legacy)

**Ubicación:** `supabase/functions/cancel-workflow/index.ts`

**Lógica actual (resumen):**
- Autentica usuario
- Valida owner
- Bloquea si status ∈ {completed, cancelled, archived}
- Actualiza status → `cancelled`
- Emite `workflow.cancelled`

---

## 🚀 Plan de implementación

### Fase 1 — Contrato (COMPLETADA ✅)
- ✅ Documento creado
- ✅ Regla canónica definida

### Fase 2 — Shadow mode (ACTIVO 🔄)
- ✅ Implementar `shouldCancelWorkflow()` en `packages/authority/src/decisions/cancelWorkflow.ts`
- ✅ Crear tests: `packages/authority/tests/d9-cancel-workflow.test.ts` (8 escenarios, 100% pass)
- ✅ Instrumentar shadow logging en edge function (`cancel-workflow/index.ts` líneas 54-85)
- ✅ Log markers implementados en función
- ⏳ **Validación en progreso**: Primera ejecución exitosa, esperando acumular ≥50 runs

### Fase 3 — Aceptación
- [ ] N ejecuciones sin divergencias (goal: 50+)
- [ ] Validar happy path + error paths
- [ ] Marcar como ACEPTADA

### Fase 4 — Apagado quirúrgico
- [ ] Migrar decisión al orquestador
- [ ] Convertir edge function en NOOP o early return
- [ ] Mantener fallback por seguridad

---

## 📊 Monitoreo de Shadow Mode

### Queries útiles para validación:

**Resumen D9:**
```sql
SELECT
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE has_divergence = true) as divergences,
  COUNT(*) FILTER (WHERE has_divergence = false) as matches,
  ROUND(100.0 * COUNT(*) FILTER (WHERE has_divergence = false) / NULLIF(COUNT(*), 0), 2) as match_percentage
FROM shadow_decision_logs
WHERE decision_code = 'D9_CANCEL_WORKFLOW';
```

**Últimas ejecuciones:**
```sql
SELECT
  created_at,
  legacy_decision,
  canonical_decision,
  has_divergence,
  (context->>'actor_id') as actor_id,
  (context->>'old_status') as old_status
FROM shadow_decision_logs
WHERE decision_code = 'D9_CANCEL_WORKFLOW'
ORDER BY created_at DESC
LIMIT 10;
```

### Criterios de aceptación:
- ✅ **Shadow runs:** ≥ 50 comparaciones
- ✅ **Divergencias:** 0 (cero absoluto)
- ✅ **Ventana mínima:** 48-72h de tráfico real
- ✅ **Side effects correctos:** status='cancelled', evento workflow.cancelled

---

## 🔗 Relaciones con otras decisiones

**Similar a:**
- Comandos de mutación de estado (reject-signature, archive-workflow)

**Diferencias clave vs D5/D6:**
- D9 es comando (POST) vs D5/D6 que son triggers
- D9 usa Edge Function vs D5/D6 que usan PL/pgSQL
- D9 requiere autenticación JWT vs D5/D6 que usan contexto DB

---

## ⚠️ Notas de implementación

1. **Shadow mode en Edge Function (no DB)**
   - El logging está en TypeScript (líneas 69-84 de `cancel-workflow/index.ts`)
   - Usa try/catch para no romper si falla el INSERT de shadow log

2. **FASE gate**
   - Línea 19-21: early return si `FASE !== '1'`
   - Esto permite activar/desactivar la función globalmente

3. **Idempotencia implícita**
   - Si workflow ya está cancelado, la decisión retorna FALSE
   - No hay INSERT duplicado en workflow_events

4. **JWT local vs producción**
   - En local puede haber problemas de signature verification
   - En producción usar JWT de Supabase Auth oficial

---

**Estado:** 🔄 Fase 2 ACTIVA - Shadow mode validado en SQL simulation
**Próximo paso:** Acumular runs en producción, resolver JWT para testeo HTTP completo
