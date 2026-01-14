# 🔧 Solución al Bug: "No se encontró el firmante"

**Fecha**: 2026-01-13
**Estado**: ✅ IDENTIFICADO - 🔧 SOLUCIÓN PROPUESTA

---

## 🔴 Problema Principal Identificado

El código está intentando leer una columna `otp_verified` de la tabla `workflow_signers` que **NUNCA FUE CREADA**.

### Ubicación del Bug

**Archivo**: `/supabase/functions/apply-signer-signature/index.ts`

**Línea 38**: Intenta leer la columna inexistente
```typescript
const { data, error } = await supabase
  .from('workflow_signers')
  .select('id, workflow_id, status, otp_verified')  // ← otp_verified NO EXISTE
  .eq('id', signerId)
  .single()
```

**Línea 62**: Valida una columna que siempre será `undefined`
```typescript
if (!signer.otp_verified) {  // ← Siempre undefined
  return json({ error: 'OTP not verified for signer' }, 403)
}
```

---

## 🔍 Diagnóstico Completo

### 1. Esquema Real de `workflow_signers`

```sql
-- Columnas existentes en workflow_signers:
- id (uuid)
- workflow_id (uuid)
- signing_order (integer)
- email (text)
- name (text)
- require_login (boolean)
- require_nda (boolean)
- quick_access (boolean)
- status (text)
- access_token_hash (text)
- first_accessed_at (timestamptz)
- signed_at (timestamptz)
- signature_data (jsonb)  ← Agregada en migración reciente
- signature_hash (text)
- ...
```

**❌ NO EXISTE**: `otp_verified`

### 2. Esquema de `signer_otps` (donde SÍ está la info de OTP)

```sql
CREATE TABLE signer_otps (
  signer_id uuid PRIMARY KEY,
  workflow_id uuid,
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz  ← AQUÍ está la verificación de OTP
);
```

### 3. Cómo funciona actualmente la verificación de OTP

**Endpoint**: `verify-signer-otp/index.ts:72-78`

Cuando un guest verifica su OTP:
```typescript
const { error: updateErr } = await supabase
  .from('signer_otps')
  .update({
    attempts: record.attempts + 1,
    verified_at: isValid ? new Date().toISOString() : null  // ← Se marca AQUÍ
  })
  .eq('signer_id', signerId)
```

✅ Actualiza `signer_otps.verified_at`
❌ NO actualiza ninguna columna en `workflow_signers` porque no existe

---

## 💡 Solución Propuesta

Hay **dos opciones**:

### Opción A: Verificar OTP usando JOIN (Recomendada)

**Ventaja**: No requiere modificar el esquema de la base de datos

**Archivo a modificar**: `/supabase/functions/apply-signer-signature/index.ts`

**Cambio en líneas 36-64**:

```typescript
if (signerId) {
  // 1. Buscar signer con JOIN a signer_otps
  const { data, error } = await supabase
    .from('workflow_signers')
    .select(`
      id,
      workflow_id,
      status,
      signer_otps!inner(verified_at)
    `)
    .eq('id', signerId)
    .single()

  if (error || !data) {
    console.error('Signer not found', { signerId, error })
    return json({ error: 'Signer not found' }, 404)
  }

  signer = data

  // 2. Validar que OTP fue verificado
  const otpVerified = data.signer_otps?.verified_at != null

  if (!otpVerified) {
    console.error('OTP not verified', { signerId })
    return json({ error: 'OTP not verified for signer' }, 403)
  }
}
```

### Opción B: Agregar columna `otp_verified` a `workflow_signers`

**Ventaja**: Más simple de consultar
**Desventaja**: Requiere migración de base de datos y sincronización

**Paso 1**: Crear migración

```bash
touch supabase/migrations/20260113120000_add_otp_verified_to_signers.sql
```

**Contenido de la migración**:
```sql
-- Add otp_verified column to workflow_signers
ALTER TABLE public.workflow_signers
ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_workflow_signers_otp_verified
  ON public.workflow_signers(otp_verified)
  WHERE otp_verified = TRUE;

-- Comment
COMMENT ON COLUMN public.workflow_signers.otp_verified IS
  'Indicates whether the signer has verified their email via OTP. Synchronized from signer_otps.verified_at.';
```

**Paso 2**: Modificar `verify-signer-otp` para actualizar ambas tablas

**Archivo**: `/supabase/functions/verify-signer-otp/index.ts`

**Agregar después de línea 78**:
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
    // No fallar la request, OTP ya fue verificado
  }
}
```

---

## 🚀 Plan de Implementación (Opción A - Recomendada)

### 1. Aplicar migraciones pendientes

```bash
cd /home/manu/dev/ecosign
supabase db reset  # Esto aplicará todas las migraciones
```

### 2. Modificar `apply-signer-signature`

```bash
# El archivo a editar:
supabase/functions/apply-signer-signature/index.ts
```

**Cambios específicos**:

**ANTES (líneas 36-42)**:
```typescript
const { data, error } = await supabase
  .from('workflow_signers')
  .select('id, workflow_id, status, otp_verified')
  .eq('id', signerId)
  .single()
if (error || !data) return json({ error: 'Signer not found' }, 404)
signer = data
```

**DESPUÉS**:
```typescript
const { data, error } = await supabase
  .from('workflow_signers')
  .select(`
    id,
    workflow_id,
    status,
    signer_otps!inner(verified_at)
  `)
  .eq('id', signerId)
  .single()

if (error || !data) {
  console.error('apply-signer-signature: Signer not found', { signerId, error })
  return json({ error: 'Signer not found' }, 404)
}

signer = {
  ...data,
  otp_verified: data.signer_otps?.verified_at != null
}
```

**ANTES (líneas 62-64)**:
```typescript
// Validate OTP confirmed
if (!signer.otp_verified) {
  return json({ error: 'OTP not verified for signer' }, 403)
}
```

**DESPUÉS**:
```typescript
// Validate OTP confirmed
if (!signer.otp_verified) {
  console.error('apply-signer-signature: OTP not verified', {
    signerId: signer.id,
    otpVerifiedAt: signer.signer_otps?.verified_at
  })
  return json({ error: 'OTP not verified for signer' }, 403)
}
```

### 3. Hacer deploy del fix

```bash
# Deploy de la función modificada
supabase functions deploy apply-signer-signature
```

### 4. Probar el flujo end-to-end

1. Guest accede al link de invitación
2. Ingresa nombre/email
3. Recibe OTP
4. Verifica OTP
5. Visualiza documento
6. Aplica firma ← **AQUÍ debería funcionar ahora**

---

## 🧪 Testing

### Test 1: Verificar que el JOIN funciona

```bash
# Ejecutar en SQL Editor de Supabase
SELECT
  ws.id,
  ws.email,
  ws.status,
  so.verified_at as otp_verified_at
FROM workflow_signers ws
LEFT JOIN signer_otps so ON so.signer_id = ws.id
LIMIT 5;
```

### Test 2: Simular el flujo completo

```bash
# 1. Crear un workflow de prueba (desde la UI)
# 2. Invitar a un guest (ejemplo: test@example.com)
# 3. Acceder con el link de invitación
# 4. Completar verificación OTP
# 5. Intentar firmar
# 6. Verificar que NO aparece el error "Signer not found"
```

### Test 3: Verificar logs del Edge Function

```bash
# En Dashboard → Edge Functions → apply-signer-signature → Logs
# Buscar:
# ✅ "apply-signer-signature: Looking for signerId: ..."
# ✅ "apply-signer-signature: Query result: { data: {...}, error: null }"
# ❌ NO debería aparecer: "Signer not found"
```

---

## 📊 Estado de Migraciones

### Migraciones Pendientes (no aplicadas en local)

```
❌ 20260112130000_workflow_states_v2.sql
❌ 20260112143000_update_notify_signer_link_statuses.sql
❌ 20260112152000_fix_workflow_states_migration_order.sql
❌ 20260112165000_create_workflow_events.sql  ← CRÍTICA (crea workflow_events)
❌ 20260112173000_update_workflow_events_types.sql
❌ 20260113015223_add_signature_data_to_signers.sql  ← CRÍTICA (agrega signature_data)
❌ 20260113053000_extend_workflow_notification_types.sql
```

### Comando para aplicar migraciones

```bash
cd /home/manu/dev/ecosign
supabase db reset
```

**⚠️ ADVERTENCIA**: `db reset` borrará todos los datos de la base de datos local y la recreará desde cero aplicando todas las migraciones.

Si querés preservar datos, usá:
```bash
supabase db push --dry-run  # Ver qué cambiaría
supabase db push           # Aplicar solo migraciones nuevas
```

---

## 🔌 Verificación del Webhook (Bonus)

Una vez que apliques el fix del signer, verificá que el webhook esté configurado correctamente:

### Checklist del Webhook

```
✅ Database → Webhooks → process-signer-signed-webhook
✅ Tipo: "HTTP Request" (NO "Edge Function")
✅ Tabla: public.workflow_events
✅ Evento: INSERT
✅ Filtro: event_type=eq.signer.signed
✅ URL: https://<TU_PROJECT_REF>.supabase.co/functions/v1/process-signer-signed
✅ Headers:
   - Content-Type: application/json
   - apikey: <TU_SERVICE_ROLE_KEY>
✅ Body: { "record": {{ record }} }
✅ Enabled: TRUE (toggle verde)
```

### Probar el Webhook

```sql
-- Ejecutar en SQL Editor después de que un guest firme
SELECT * FROM workflow_events
WHERE event_type = 'signer.signed'
ORDER BY created_at DESC
LIMIT 5;
```

Luego verificar:
```
Dashboard → Database → Webhooks → process-signer-signed-webhook → Delivery Logs
```

Deberías ver:
- Status: `200` ✅
- Si ves `404`: URL incorrecta
- Si ves `401`: apikey incorrecta
- Si no ves nada: Webhook no configurado como "HTTP Request"

---

## 📁 Archivos Modificados

| Archivo | Cambio | Prioridad |
|---------|--------|-----------|
| `/supabase/functions/apply-signer-signature/index.ts` | Fix del JOIN para verificar OTP | 🔴 CRÍTICO |
| Base de datos local | Aplicar migraciones pendientes | 🔴 CRÍTICO |
| Webhook config | Verificar configuración HTTP Request | 🟡 IMPORTANTE |

---

## ✅ Checklist de Implementación

- [ ] Aplicar migraciones pendientes (`supabase db reset`)
- [ ] Modificar `apply-signer-signature/index.ts` (líneas 36-64)
- [ ] Deploy de la función modificada
- [ ] Probar flujo end-to-end con un guest de prueba
- [ ] Verificar logs del Edge Function
- [ ] Verificar que webhook se dispara correctamente
- [ ] Verificar Delivery Logs del webhook
- [ ] Confirmar que el PDF se procesa correctamente

---

## 🎯 Resultado Esperado

Después de aplicar estos cambios:

1. ✅ Los guests podrán verificar su OTP correctamente
2. ✅ Los guests podrán aplicar su firma sin error "Signer not found"
3. ✅ El evento `signer.signed` se creará en `workflow_events`
4. ✅ El webhook se disparará y procesará el PDF
5. ✅ La firma se aplicará visualmente al documento
6. ✅ El estado del signer cambiará a `signed`

---

## 📞 Contacto / Más Info

**Reportes generados**:
- `/home/manu/dev/ecosign/REPORTE_ANALISIS_FIRMA_GUESTS.md` - Análisis detallado del problema
- `/home/manu/dev/ecosign/scripts/debug-signer-flow.sql` - Queries de diagnóstico
- `/home/manu/dev/ecosign/scripts/WEBHOOK_SETUP.md` - Guía de configuración del webhook

**Archivos clave**:
- `/supabase/functions/apply-signer-signature/index.ts` - Función a modificar
- `/supabase/functions/verify-signer-otp/index.ts` - Función de verificación OTP
- `/client/src/pages/SignWorkflowPage.tsx` - Frontend del flujo de firma

---

**Fin del documento de solución**
