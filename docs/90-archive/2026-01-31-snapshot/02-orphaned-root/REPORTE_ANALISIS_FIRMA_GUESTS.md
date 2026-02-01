# 📋 Reporte de Análisis: Error "No se encontró el firmante"

**Fecha**: 2026-01-13
**Flujo**: Firma de documentos por guests/firmantes invitados
**Error reportado**: "No se encontró el firmante" al aplicar firma

---

## 🔴 Resumen Ejecutivo

El error "No se encontró el firmante" ocurre en el endpoint `apply-signer-signature` cuando un guest intenta aplicar su firma después de completar la verificación OTP.

**Ubicación del error**: `/supabase/functions/apply-signer-signature/index.ts:41`

**Bugs identificados**:
1. **Bug crítico de estado OTP**: `verify-signer-otp` NO actualiza `workflow_signers.otp_verified`
2. **Posible bug de datos**: El `signerId` enviado desde el frontend puede ser NULL o inválido

---

## 🔍 Análisis del Flujo Completo

### 1️⃣ Flujo Exitoso Esperado

```
Guest recibe link con TOKEN
  ↓
[signer-access] Valida token → retorna signer_id, workflow_id, otp_verified
  ↓
Guest acepta términos y condiciones
  ↓
Guest ingresa nombre/email
  ↓
[confirm-signer-identity] Actualiza nombre del signer
  ↓
Sistema envía OTP por email
  ↓
[send-signer-otp] Genera y guarda OTP en signer_otps
  ↓
Guest ingresa OTP
  ↓
[verify-signer-otp] Marca signer_otps.verified_at ❌ NO actualiza workflow_signers.otp_verified
  ↓
Guest visualiza documento
  ↓
Guest crea firma en modal (autógrafa/tecleada/cargada)
  ↓
Guest hace click en "Aplicar firma"
  ↓
Frontend llama: apply-signer-signature con signerId
  ↓
[apply-signer-signature] Busca signer por signerId → ❌ ERROR 404 "Signer not found"
```

---

## 🐛 Bug #1: Estado OTP no se sincroniza

### Problema

El endpoint `verify-signer-otp` actualiza la tabla `signer_otps` pero NO actualiza la columna `otp_verified` en la tabla `workflow_signers`.

**Archivo**: `/supabase/functions/verify-signer-otp/index.ts`

**Código problemático** (líneas 72-78):
```typescript
const { error: updateErr } = await supabase
  .from('signer_otps')
  .update({
    attempts: record.attempts + 1,
    verified_at: isValid ? new Date().toISOString() : null
  })
  .eq('signer_id', signerId)
```

**Consecuencia**:
- `signer_otps.verified_at` → ✅ Se actualiza correctamente
- `workflow_signers.otp_verified` → ❌ Permanece en FALSE

### Impacto

Cuando el guest intenta aplicar la firma, el endpoint `apply-signer-signature` valida:

**Archivo**: `/supabase/functions/apply-signer-signature/index.ts:62-64`
```typescript
if (!signer.otp_verified) {
  return json({ error: 'OTP not verified for signer' }, 403)
}
```

Si `workflow_signers.otp_verified` está en FALSE, la firma será rechazada con error 403.

---

## 🐛 Bug #2: Validación del signerId

### Problema

El error reportado es "Signer not found" (404), lo que indica que la búsqueda del signer está fallando ANTES de la validación de OTP.

**Archivo**: `/supabase/functions/apply-signer-signature/index.ts:35-42`
```typescript
if (signerId) {
  const { data, error } = await supabase
    .from('workflow_signers')
    .select('id, workflow_id, status, otp_verified')
    .eq('id', signerId)
    .single()
  if (error || !data) return json({ error: 'Signer not found' }, 404)  // ← ERROR AQUÍ
  signer = data
}
```

### Causas posibles

1. **El `signerId` es NULL o undefined**
   - El frontend envía: `signerId: signerData.signer_id` (línea 417 de SignWorkflowPage.tsx)
   - Si `signerData.signer_id` es null, la búsqueda falla

2. **El signer fue eliminado de la base de datos**
   - Poco probable, pero posible en concurrencia

3. **El signer_id en signerData está desactualizado**
   - El state del frontend no se refrescó después de alguna operación

---

## 🔧 Verificaciones Recomendadas

### 1. Verificar logs en el navegador

Abrí las DevTools del navegador (F12) y ejecutá:

```javascript
// En la consola, después de que falla la firma
console.log('signerData:', signerData)
console.log('signerId enviado:', signerData?.signer_id)
```

**Resultado esperado**: `signer_id` debe ser un UUID válido como `"550e8400-e29b-41d4-a716-446655440000"`

**Si ves NULL o undefined**: El bug está en el frontend (state no se inicializó correctamente)

---

### 2. Verificar estado en base de datos

Ejecutá esta query en Supabase SQL Editor después de que el guest verifique el OTP:

```sql
-- Reemplazá 'guest_email@example.com' con el email del guest
SELECT
  ws.id as signer_id,
  ws.email,
  ws.name,
  ws.otp_verified as workflow_signers_otp_verified,
  ws.status,
  so.verified_at as signer_otps_verified_at
FROM workflow_signers ws
LEFT JOIN signer_otps so ON so.signer_id = ws.id
WHERE ws.email = 'guest_email@example.com'
ORDER BY ws.created_at DESC
LIMIT 1;
```

**Resultado esperado**:
```
signer_id                              | email               | otp_verified | verified_at
---------------------------------------|---------------------|--------------|------------------
550e8400-e29b-41d4-a716-446655440000   | guest@example.com   | TRUE         | 2026-01-13 ...
```

**Si `otp_verified` es FALSE pero `verified_at` tiene fecha**: Confirmado Bug #1

**Si `signer_id` es NULL**: El signer no se creó correctamente

---

### 3. Verificar respuesta del endpoint signer-access

En las DevTools, ve a la pestaña Network y busca la llamada a `signer-access` después de verificar OTP.

**Payload de respuesta esperado**:
```json
{
  "signer_id": "550e8400-e29b-41d4-a716-446655440000",
  "workflow_id": "...",
  "otp_verified": true,  // ← Debe ser true después de verificar OTP
  "workflow": { ... }
}
```

**Si `otp_verified` es false**: El problema es que el endpoint `signer-access` lee de `workflow_signers.otp_verified`, que no se actualizó.

---

### 4. Verificar logs del Edge Function

Ve a: **Dashboard → Edge Functions → apply-signer-signature → Logs**

Buscá el log de error:
```
apply-signer-signature error: ...
```

Los logs te dirán:
- Si `signerId` es null
- Si la query a la base de datos falló
- El mensaje de error exacto

---

## 🔌 Verificación del Webhook

El usuario mencionó problemas con la configuración del webhook. Aquí está la configuración correcta:

### ✅ Configuración Correcta

**Tipo**: HTTP Request (NO "Supabase Edge Function")

**Por qué HTTP Request**:
- ✅ Tiene Delivery Logs visibles
- ✅ Control total sobre headers
- ✅ Debugging completo
- ❌ "Edge Function" type falla silenciosamente y no tiene logs

### 📋 Configuración Manual (Dashboard)

1. Ir a: **Database → Webhooks → Create new webhook**
2. Configurar:

```
Name: process-signer-signed-webhook
Type: HTTP Request  ← CRÍTICO
Schema: public
Table: workflow_events
Events: ☑ INSERT only
Filter: event_type=eq.signer.signed

Method: POST
URL: https://<TU_PROJECT_REF>.supabase.co/functions/v1/process-signer-signed

Headers:
  Content-Type: application/json
  apikey: <TU_SERVICE_ROLE_KEY>

Body:
{
  "record": {{ record }}
}
```

3. **Habilitar**: Toggle a verde

### 🧪 Probar el Webhook

Ejecutá este INSERT de prueba:

```sql
-- Reemplazá con IDs reales de tu base de datos
INSERT INTO workflow_events (workflow_id, signer_id, event_type)
VALUES (
  'tu-workflow-uuid',
  'tu-signer-uuid',
  'signer.signed'
);
```

Luego verificá:
1. **Database → Webhooks → Tu webhook → Delivery Logs**
2. Deberías ver:
   - `200` → ✅ Éxito
   - `401` → ❌ apikey incorrecta
   - `404` → ❌ URL incorrecta
   - `500` → ❌ Error en el Edge Function

**Si no ves NADA en Delivery Logs**: Estás usando "Edge Function" type en lugar de "HTTP Request"

---

## 💡 Soluciones Propuestas

### Solución 1: Actualizar otp_verified en workflow_signers

**Archivo a modificar**: `/supabase/functions/verify-signer-otp/index.ts`

Agregar después de la línea 78:

```typescript
// Después de actualizar signer_otps
if (isValid) {
  // También actualizar workflow_signers.otp_verified
  const { error: signerUpdateErr } = await supabase
    .from('workflow_signers')
    .update({ otp_verified: true })
    .eq('id', signerId)

  if (signerUpdateErr) {
    console.error('Failed to update workflow_signers.otp_verified', signerUpdateErr)
  }
}
```

### Solución 2: Validar signerId en el frontend

**Archivo a modificar**: `/client/src/pages/SignWorkflowPage.tsx`

Agregar validación en `handleSignatureApplied` (antes de la línea 415):

```typescript
const handleSignatureApplied = async (signatureData: any) => {
  if (!signerData) return

  // Validar que tenemos un signerId válido
  if (!signerData.signer_id) {
    console.error('signerId is null or undefined', signerData)
    setError('Error: No se pudo identificar el firmante. Recargá la página.')
    return
  }

  try {
    // ... resto del código
```

### Solución 3: Mejorar logs para debugging

**Archivo a modificar**: `/supabase/functions/apply-signer-signature/index.ts`

Agregar logs antes de la línea 36:

```typescript
if (signerId) {
  console.log('apply-signer-signature: Looking for signerId:', signerId)

  const { data, error } = await supabase
    .from('workflow_signers')
    .select('id, workflow_id, status, otp_verified')
    .eq('id', signerId)
    .single()

  console.log('apply-signer-signature: Query result:', { data, error })

  if (error || !data) {
    console.error('apply-signer-signature: Signer not found', { signerId, error })
    return json({ error: 'Signer not found' }, 404)
  }
```

---

## 📊 Diagrama del Problema

```
┌─────────────────────────────────────────────────────┐
│  Guest verifica OTP                                 │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  verify-signer-otp actualiza:                       │
│  ✅ signer_otps.verified_at = timestamp             │
│  ❌ workflow_signers.otp_verified = (sin cambios)   │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Frontend refresca: signer-access                   │
│  Lee de workflow_signers                            │
│  Retorna: otp_verified = false ❌                   │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Guest aplica firma                                 │
│  Frontend envía: signerId                           │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  apply-signer-signature:                            │
│  1. Busca signer por signerId                       │
│     └─ Si no existe → ❌ 404 "Signer not found"     │
│  2. Valida signer.otp_verified                      │
│     └─ Si es false → ❌ 403 "OTP not verified"      │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Próximos Pasos Inmediatos

1. **Verificar logs del navegador**
   - Confirmar que `signerData.signer_id` tiene un UUID válido

2. **Verificar estado en base de datos**
   - Ejecutar la query SQL para ver el estado de `otp_verified`

3. **Verificar logs del Edge Function**
   - Dashboard → Edge Functions → apply-signer-signature → Logs

4. **Verificar configuración del webhook**
   - Confirmar que es "HTTP Request" (no "Edge Function")
   - Verificar Delivery Logs

5. **Aplicar soluciones**
   - Implementar Solución 1 (actualizar otp_verified)
   - Implementar Solución 2 (validar signerId)
   - Implementar Solución 3 (mejorar logs)

---

## 📞 Información de Contacto

**Archivos clave a revisar**:
- `/supabase/functions/apply-signer-signature/index.ts:35-64`
- `/supabase/functions/verify-signer-otp/index.ts:72-78`
- `/client/src/pages/SignWorkflowPage.tsx:407-439`
- `/scripts/WEBHOOK_SETUP.md` (guía completa del webhook)

**Logs a verificar**:
- Navegador: DevTools → Console
- Backend: Dashboard → Edge Functions → Logs
- Webhook: Dashboard → Database → Webhooks → Delivery Logs

---

## ✅ Checklist de Debugging

- [ ] Verificar `signerData.signer_id` en consola del navegador
- [ ] Ejecutar query SQL para ver estado de `otp_verified`
- [ ] Revisar logs de `apply-signer-signature` en Dashboard
- [ ] Confirmar que webhook es tipo "HTTP Request"
- [ ] Verificar Delivery Logs del webhook
- [ ] Implementar Solución 1: Actualizar `otp_verified`
- [ ] Implementar Solución 2: Validar `signerId` en frontend
- [ ] Implementar Solución 3: Agregar logs de debugging
- [ ] Probar flujo completo end-to-end
- [ ] Confirmar que webhook se dispara correctamente

---

**Fin del reporte**
