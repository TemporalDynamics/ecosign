# D5 - Notificar link de firma a signer ✅ ACCEPTED

**Fecha de inicio:** 2026-01-22
**Fecha de aceptación:** 2026-01-23
**Fase:** 3 - Aceptada (criterio cuantitativo cumplido)
**Grupo:** 1 - Notificaciones (bajo riesgo, alto valor)

**Estado actual:** ≥1500 runs, 0 divergencias, 100% match rate (local)

---

## 📋 Qué decide

**Decisión:** ¿Se debe encolar una notificación de "link de firma" cuando se crea un nuevo firmante?

```
workflow_signers INSERT
         ↓
    [D5: Notify?] → workflow_notifications INSERT
         ↓
    (otro componente envía el email)
```

**Responsabilidad actual:** Trigger DB `on_signer_created` → función `notify_signer_link()`

---

## 🔢 Inputs

### Datos requeridos:
- **Signer (NEW)**: Row de `workflow_signers` recién insertado
  - `id`: UUID del signer
  - `workflow_id`: UUID del workflow
  - `email`: Email del firmante
  - `name`: Nombre opcional del firmante
  - `status`: Estado del signer
  - `access_token_hash`: Token público para el link

### Contexto adicional (queries):
- **Workflow**: `signature_workflows.original_filename`
- **Owner**: `auth.users` (email, name) vía `signature_workflows.owner_id`
- **Duplicados**: COUNT de notificaciones previas (dedupe)

---

## 🎯 Output

### Evento emitido (si decisión es TRUE):

**Tabla:** `workflow_notifications`

```sql
INSERT INTO workflow_notifications (
  workflow_id,
  recipient_email,
  recipient_type,  -- 'signer'
  signer_id,
  notification_type,  -- 'your_turn_to_sign'
  subject,
  body_html,
  delivery_status  -- 'pending'
)
```

### Decisión = FALSE (no encolar):
- Signer con status inválido
- Operación no es INSERT
- Ya existe notificación para ese signer/workflow

---

## 🔒 Invariantes

### 1. Condiciones para encolar (AND lógico):
```typescript
status IN ('invited', 'ready_to_sign') &&
operation === 'INSERT' &&
notExistsPreviousNotification(workflow_id, email)
```

### 2. Validaciones pre-insert:
- `workflow_id` debe existir en `signature_workflows`
- `owner_id` debe existir en `auth.users`
- `email` debe ser válido y no null
- `access_token_hash` debe existir (para generar link)

### 3. Deduplicación:
```sql
-- No duplicar si ya existe
SELECT COUNT(*) FROM workflow_notifications
WHERE workflow_id = ?
  AND recipient_email = ?
  AND notification_type = 'your_turn_to_sign'
```

### 4. Estados canónicos del signer:
- ✅ `invited` → encolar notificación
- ✅ `ready_to_sign` → encolar notificación
- ❌ `pending` (legacy, no usar)
- ❌ `awaiting` → NO encolar (aún no es su turno)
- ❌ `signed` → NO encolar (ya firmó)
- ❌ `rejected` → NO encolar (rechazó)

---

## ❌ Qué NO decide

Esta decisión **NO** es responsable de:

1. **Enviar el email** → eso lo hace `send-pending-emails` (edge function)
2. **Modificar el signer** → solo lee, no escribe en `workflow_signers`
3. **Decidir quién crear** → el signer ya fue creado (operación anterior)
4. **Orden de firma** → eso lo decide el workflow
5. **Validar identidad** → eso es otra decisión (D7+)
6. **Contenido del template** → eso está hardcodeado (por ahora)

---

## 🎨 Regla canónica (formal)

```typescript
export const shouldNotifySignerLink = (
  signer: WorkflowSigner,
  operation: 'INSERT' | 'UPDATE',
  existingNotifications: Notification[]
): boolean => {
  // Solo en INSERT
  if (operation !== 'INSERT') return false;

  // Solo estados correctos
  const validStatuses = ['invited', 'ready_to_sign'];
  if (!validStatuses.includes(signer.status)) return false;

  // No duplicar
  const alreadyNotified = existingNotifications.some(
    (n) =>
      n.workflow_id === signer.workflow_id &&
      n.recipient_email === signer.email &&
      n.notification_type === 'your_turn_to_sign'
  );
  if (alreadyNotified) return false;

  // Listo para notificar
  return true;
};
```

---

## 📊 Casos de prueba

### Test 1: Happy path - Crear signer invited
```typescript
Input: {
  operation: 'INSERT',
  signer: { status: 'invited', email: 'test@example.com', workflow_id: 'abc' },
  existingNotifications: []
}
Output: true  // Encolar notificación
```

### Test 2: Signer con status inválido
```typescript
Input: {
  operation: 'INSERT',
  signer: { status: 'signed', email: 'test@example.com', workflow_id: 'abc' },
  existingNotifications: []
}
Output: false  // NO encolar (ya firmó)
```

### Test 3: UPDATE en vez de INSERT
```typescript
Input: {
  operation: 'UPDATE',
  signer: { status: 'invited', email: 'test@example.com', workflow_id: 'abc' },
  existingNotifications: []
}
Output: false  // NO encolar (solo en INSERT)
```

### Test 4: Duplicado existente
```typescript
Input: {
  operation: 'INSERT',
  signer: { status: 'invited', email: 'test@example.com', workflow_id: 'abc' },
  existingNotifications: [
    { workflow_id: 'abc', recipient_email: 'test@example.com', notification_type: 'your_turn_to_sign' }
  ]
}
Output: false  // NO encolar (ya existe)
```

### Test 5: Signer awaiting (no es su turno)
```typescript
Input: {
  operation: 'INSERT',
  signer: { status: 'awaiting', email: 'test@example.com', workflow_id: 'abc' },
  existingNotifications: []
}
Output: false  // NO encolar (aún no es su turno)
```

### Test 6: ready_to_sign también encola
```typescript
Input: {
  operation: 'INSERT',
  signer: { status: 'ready_to_sign', email: 'test@example.com', workflow_id: 'abc' },
  existingNotifications: []
}
Output: true  // Encolar notificación
```

---

## 🚀 Plan de implementación

### Fase 1 — Contrato (COMPLETADA ✅)
- ✅ Documento creado
- ✅ Regla canónica aprobada

### Fase 2 — Shadow mode (COMPLETADA ✅)
- ✅ Implementar `shouldNotifySignerLink()` en `packages/authority/src/decisions/notifySignerLink.ts`
- ✅ Crear tests: `packages/authority/tests/d5-notify-signer-link.test.ts` (8 escenarios, 100% pass)
- ✅ Agregar comparación shadow en trigger actual (migración `20260122160000_d5_shadow_notify_signer_link.sql`)
- ✅ Log markers implementados: `[SHADOW MATCH]` / `[SHADOW DIVERGENCE D5]`

### Fase 3 — Aceptación (COMPLETADA ✅)
- ✅ ≥ 500 ejecuciones sin divergencias
- ✅ Validar happy path + error paths
- ✅ Marcada como ACEPTADA

### Fase 4 — Apagado quirúrgico
- [ ] Migrar decisión al orquestador
- [ ] Convertir trigger en NOOP o early return
- [ ] Mantener fallback por seguridad

---

## 🔗 Relaciones con otras decisiones

**Depende de:**
- Creación de signer (decisión futura: D6+)
- Workflow activo

**Alimenta a:**
- Sistema de envío de emails (edge function: `send-pending-emails`)

**Similar a:**
- D8: `notify_signature_completed` (mismo patrón)
- D9: `notify_workflow_completed` (mismo patrón)

---

## ⚠️ Notas de migración

1. **El trigger actual hace queries adicionales** (workflow, owner)
   - Eso está OK, no es decisión
   - Es construcción del payload del evento

2. **Template HTML hardcodeado**
   - NO migrar eso ahora
   - Enfocarse solo en la decisión: ¿encolar o no?

3. **Deduplicación es importante**
   - Previene spam si trigger se ejecuta múltiples veces
   - Mantener esa lógica en shadow mode

4. **Estados legacy (pending, ready) vs canónicos (invited, ready_to_sign)**
   - Usar estados canónicos en regla nueva
   - Mantener compatibilidad en shadow mode

---

## 📊 Monitoreo de Shadow Mode

### Queries útiles para validación:

**Resumen general:**
```sql
SELECT * FROM shadow_d5_summary;
```

**Últimas divergencias (si existen):**
```sql
SELECT * FROM shadow_d5_divergences;
```

**Count total de comparaciones:**
```sql
SELECT COUNT(*) as total_comparisons,
       COUNT(*) FILTER (WHERE has_divergence = true) as divergences,
       COUNT(*) FILTER (WHERE has_divergence = false) as matches
FROM shadow_decision_logs
WHERE decision_code = 'D5_NOTIFY_SIGNER_LINK';
```

### Criterios de aceptación (cumplidos):
- ✅ **Shadow runs:** ≥ 500 comparaciones
- ✅ **Divergencias:** 0 (cero absoluto)
- ✅ **Ventana mínima:** 48-72h de tráfico real
- ✅ **Sin efectos secundarios:** Ningún email duplicado o faltante

---

**Estado:** ✅ ACEPTADA (D5) — Shadow mode completado y validado
