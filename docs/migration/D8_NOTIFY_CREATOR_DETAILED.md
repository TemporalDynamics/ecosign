# D8 - Notificar al creador (detallado) ✅ ACCEPTED

**Fecha de inicio:** 2026-01-23
**Fecha de aceptación:** 2026-01-23
**Fase:** 3 - Aceptada (criterio cuantitativo cumplido)
**Grupo:** 1 - Notificaciones (bajo riesgo, alto valor)

**Estado actual:** ≥1500 runs, 0 divergencias, 100% match rate (local)

---

## 📋 Qué decide

**Decisión:** "¿Se debe encolar una notificación detallada al creador cuando un firmante completa su firma?"

**Contexto:**
Cuando un signer cambia su estado a `signed`, además de las notificaciones básicas (D6), el sistema crea **una notificación detallada** para el owner con datos técnicos (hash, timestamp, etc.).

```
workflow_signers UPDATE (status -> signed)
          ↓
     [D8: Notify?] → workflow_notifications INSERT (owner, detailed)
          ↓
     (otro componente envía el email)
```

**Responsabilidad actual:** Trigger DB `on_signature_notify_creator` → función `notify_creator_on_signature()`

---

## 🔢 Inputs

### Datos requeridos (evento):
- **Signer (NEW / OLD)**: row de `workflow_signers`
  - `id`
  - `workflow_id`
  - `email`
  - `name`
  - `status`

### Contexto adicional (queries):
- **Workflow**: `signature_workflows.original_filename`, `signature_workflows.document_hash`
- **Owner**: `auth.users` (email, name) vía `signature_workflows.owner_id`

---

## 🎯 Output

### Evento emitido (si decisión es TRUE):

**Tabla:** `workflow_notifications`

```sql
INSERT INTO workflow_notifications (
  workflow_id,
  recipient_email,
  recipient_type,  -- 'owner'
  signer_id,
  notification_type,  -- 'creator_detailed_notification'
  subject,
  body_html,
  delivery_status  -- 'pending'
)
```

### Decisión = FALSE (no encolar):
- Operación no es UPDATE
- `NEW.status != 'signed'`
- `OLD.status = 'signed'` (evita duplicados)

---

## 🔒 Invariantes

### 1. Condiciones para encolar (AND lógico):
```typescript
operation === 'UPDATE' &&
new_status === 'signed' &&
old_status !== 'signed'
```

### 2. Validaciones pre-insert:
- `workflow_id` debe existir
- `owner_id` debe existir
- `owner_email` no null
- `notification_type = 'creator_detailed_notification'` está permitido por constraint

### 3. Destinatarios:
- **Owner**: 1 notificación detallada por firma (signer)

### 4. Deduplicación:
- No se deduplica por tabla (se previene con `old_status != 'signed'`).
- `workflow_signers.status = 'signed'` es **estado terminal** y no debe reescribirse una vez alcanzado.

---

## ❌ Qué NO decide

Esta decisión **NO** es responsable de:

1. **Enviar el email** → lo hace `send-pending-emails`
2. **Modificar el signer** → solo lee, no escribe en `workflow_signers`
3. **Validar OTP / identidad** → eso ocurre antes del cambio de estado
4. **Contenido final del template** → por ahora está hardcodeado
5. **Notificar al signer** → eso es D6
6. **Notificar cierre del workflow** → eso es D7

---

## 🎨 Regla canónica (formal)

```typescript
export const shouldNotifyCreatorDetailed = (input: {
  operation: 'INSERT' | 'UPDATE'
  old_status: string | null
  new_status: string
  signer_id: string
  workflow_id: string
}): boolean => {
  if (input.operation !== 'UPDATE') return false;
  if (input.new_status !== 'signed') return false;
  if (input.old_status === 'signed') return false;
  return true;
};
```

---

## 📊 Casos de prueba

### Test 1: UPDATE ready_to_sign → signed (happy path)
```typescript
Input: { operation: 'UPDATE', old_status: 'ready_to_sign', new_status: 'signed' }
Output: true
```

### Test 2: UPDATE invited → signed (skip ready_to_sign)
```typescript
Input: { operation: 'UPDATE', old_status: 'invited', new_status: 'signed' }
Output: true
```

### Test 3: UPDATE signed → signed (duplicado)
```typescript
Input: { operation: 'UPDATE', old_status: 'signed', new_status: 'signed' }
Output: false
```

### Test 4: UPDATE invited → ready_to_sign (no signed)
```typescript
Input: { operation: 'UPDATE', old_status: 'invited', new_status: 'ready_to_sign' }
Output: false
```

### Test 5: INSERT con status signed (no aplica)
```typescript
Input: { operation: 'INSERT', old_status: null, new_status: 'signed' }
Output: false
```

### Test 6: UPDATE null → signed (edge legacy)
```typescript
Input: { operation: 'UPDATE', old_status: null, new_status: 'signed' }
Output: true
```

### Test 7: UPDATE pending → signed (otro estado válido)
```typescript
Input: { operation: 'UPDATE', old_status: 'pending', new_status: 'signed' }
Output: true
```

---

## 🔍 Autoridad actual (legacy)

**Ubicación:** Trigger `on_signature_notify_creator` en `workflow_signers`

**Función:** `notify_creator_on_signature()`

**Migración origen:**
- `supabase/migrations/20251127000000_ecox_audit_trail_and_creator_notifications.sql`

**Lógica actual (PL/pgSQL):**
```sql
IF NEW.status = 'signed'
   AND (OLD.status IS NULL OR OLD.status != 'signed')
THEN
  INSERT INTO workflow_notifications (... notification_type = 'creator_detailed_notification')
END IF;
```

---

## 🚀 Plan de implementación

### Fase 1 — Contrato (COMPLETADA ✅)
- ✅ Documento creado
- ✅ Regla canónica definida

### Fase 2 — Shadow mode (COMPLETADA ✅)
- ✅ Implementar `shouldNotifyCreatorDetailed()` en `packages/authority/src/decisions/notifyCreatorDetailed.ts`
- ✅ Crear tests unitarios (mínimo 7 escenarios)
- ✅ Agregar comparación shadow en trigger actual
- ✅ Log markers: `[SHADOW MATCH D8]` / `[SHADOW DIVERGENCE D8]`

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
- D6 (signature_completed) — transición a signed

**Alimenta a:**
- Notificación técnica detallada al creador
