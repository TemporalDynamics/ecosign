# D7 - Notificar workflow completado ✅ ACCEPTED

**Fecha de inicio:** 2026-01-23
**Fecha de aceptación:** 2026-01-23
**Fase:** 3 - Aceptada (criterio cuantitativo cumplido)
**Grupo:** 1 - Notificaciones (bajo riesgo, alto valor)

**Estado actual:** ≥500 runs, 0 divergencias, 100% match rate (local)

---

## 📋 Qué decide

**Decisión:** "¿Se debe encolar notificaciones cuando un workflow pasa a `completed`?"

**Contexto:**
Cuando un workflow cambia a estado `completed`, el sistema debe notificar:
1. Al **owner** del workflow (documento completado)
2. A **todos los firmantes que firmaron** (documento completado)

```
signature_workflows UPDATE (status -> completed)
          ↓
     [D7: Notify?] → workflow_notifications INSERT (owner + signers)
          ↓
     (otro componente envía el email)
```

**Responsabilidad actual:** Trigger DB `on_workflow_completed` → función `notify_workflow_completed()`

---

## 🔢 Inputs

### Datos requeridos (evento):
- **Workflow (NEW / OLD)**: row de `signature_workflows`
  - `id`
  - `status`
  - `owner_id`
  - `original_filename`

### Contexto adicional (queries):
- **Owner**: `auth.users` (email, name) vía `signature_workflows.owner_id`
- **Firmantes**: `workflow_signers` (email, name, status) para `workflow_id`

---

## 🎯 Output

### Evento emitido (si decisión es TRUE):

**Tabla:** `workflow_notifications`

```sql
-- 1) Owner
INSERT INTO workflow_notifications (
  workflow_id,
  recipient_email,
  recipient_type,  -- 'owner'
  notification_type,  -- 'workflow_completed'
  subject,
  body_html,
  delivery_status  -- 'pending'
);

-- 2) Firmantes (solo status = 'signed')
INSERT INTO workflow_notifications (
  workflow_id,
  recipient_email,
  recipient_type,  -- 'signer'
  notification_type,  -- 'workflow_completed'
  subject,
  body_html,
  delivery_status  -- 'pending'
);
```

### Decisión = FALSE (no encolar):
- Operación no es UPDATE
- `NEW.status != 'completed'`
- `OLD.status = 'completed'` (evita duplicados por re-update)

---

## 🔒 Invariantes

### 1. Condiciones para encolar (AND lógico):
```typescript
operation === 'UPDATE' &&
new_status === 'completed' &&
old_status !== 'completed'
```

### 2. Validaciones pre-insert:
- `workflow_id` debe existir
- `owner_id` debe existir
- `owner_email` no null

### 3. Destinatarios:
- **Owner**: 1 notificación
- **Firmantes**: únicamente `workflow_signers` con `status = 'signed'`
- **No notificar**: `rejected`, `expired`, `cancelled`, `pending`, `invited`, `awaiting` u otros estados no firmados

### 4. Deduplicación:
- No se deduplica por tabla (se previene con `old_status != 'completed'`).
- `signature_workflows.status = 'completed'` es **estado terminal** y no debe reescribirse una vez alcanzado.

---

## ❌ Qué NO decide

Esta decisión **NO** es responsable de:

1. **Marcar el workflow como `completed`** → eso ocurre antes (otro proceso)
2. **Enviar el email** → lo hace `send-pending-emails`
3. **Construir templates definitivos** → por ahora están hardcodeados
4. **Validar si todos los firmantes firmaron** → eso define el cambio de estado
5. **Generar el .ECO** → eso es otro worker/proceso

---

## 🎨 Regla canónica (formal)

```typescript
export const shouldNotifyWorkflowCompleted = (input: {
  operation: 'INSERT' | 'UPDATE'
  old_status: string | null
  new_status: string
}): boolean => {
  if (input.operation !== 'UPDATE') return false;
  if (input.new_status !== 'completed') return false;
  if (input.old_status === 'completed') return false;
  return true;
};
```

---

## 📊 Casos de prueba

### Test 1: Happy path - transición a completed
```typescript
Input: { operation: 'UPDATE', old_status: 'active', new_status: 'completed' }
Output: true
```

### Test 2: Update pero sin cambio a completed
```typescript
Input: { operation: 'UPDATE', old_status: 'active', new_status: 'active' }
Output: false
```

### Test 3: Re-update ya completed
```typescript
Input: { operation: 'UPDATE', old_status: 'completed', new_status: 'completed' }
Output: false
```

### Test 4: INSERT no aplica
```typescript
Input: { operation: 'INSERT', old_status: null, new_status: 'completed' }
Output: false
```

### Test 5: Cancelled no aplica
```typescript
Input: { operation: 'UPDATE', old_status: 'active', new_status: 'cancelled' }
Output: false
```

### Test 6: OLD null (legacy edge)
```typescript
Input: { operation: 'UPDATE', old_status: null, new_status: 'completed' }
Output: true
```

### Test 7: Estado previo desconocido
```typescript
Input: { operation: 'UPDATE', old_status: 'processing', new_status: 'completed' }
Output: true
```

---

## 🔍 Autoridad actual (legacy)

**Ubicación:** Trigger `on_workflow_completed` en `signature_workflows`

**Función:** `notify_workflow_completed()`

**Migración origen:**
- `supabase/migrations/20251126000000_guest_signature_workflow_automation.sql`

**Lógica actual (PL/pgSQL):**
```sql
IF NEW.status = 'completed'
   AND (OLD.status IS NULL OR OLD.status != 'completed')
THEN
  -- Owner + todos los firmantes con status = 'signed'
  INSERT INTO workflow_notifications (...)
END IF;
```

---

## 🚀 Plan de implementación

### Fase 1 — Contrato (COMPLETADA ✅)
- ✅ Documento creado
- ✅ Regla canónica definida

### Fase 2 — Shadow mode (COMPLETADA ✅)
- ✅ Implementar `shouldNotifyWorkflowCompleted()` en `packages/authority/src/decisions/notifyWorkflowCompleted.ts`
- ✅ Crear tests unitarios (mínimo 6 escenarios)
- ✅ Agregar comparación shadow en trigger actual
- ✅ Log markers: `[SHADOW MATCH D7]` / `[SHADOW DIVERGENCE D7]`

### Fase 3 — Aceptación (COMPLETADA ✅)
- ✅ ≥ 500 comparaciones
- ✅ 0 divergencias
- ✅ Evidencia local documentada

### Fase 4 — Apagado quirúrgico
- [ ] Migrar decisión al orquestador
- [ ] Convertir trigger a NOOP o early return

---

## 🔗 Relaciones con otras decisiones

**Depende de:**
- D6 (signature_completed) — firmas individuales
- Lógica que marca `signature_workflows.status = 'completed'`

**Alimenta a:**
- Notificación de cierre global del workflow
- Entrega de certificado .ECO
