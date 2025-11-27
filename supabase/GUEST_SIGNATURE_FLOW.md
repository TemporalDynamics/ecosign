# 🎯 Flujo de Firmas de Invitados - EcoSign

## 📋 Resumen

Este documento describe el flujo automatizado de firmas para invitados (usuarios sin cuenta) implementado en EcoSign.

---

## 🏗️ Arquitectura

### Tablas Principales

1. **`signature_workflows`** - Flujos de firma completos
2. **`workflow_signers`** - Firmantes individuales
3. **`workflow_signatures`** - Registro inmutable de firmas
4. **`workflow_notifications`** - Cola de emails pendientes

### Edge Functions

- **`send-pending-emails`** - Procesa y envía emails en cola
  - URL: `https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/send-pending-emails`
  - Se ejecuta vía cron job o manualmente

### Triggers SQL

1. **`on_signer_created`** - Envía link de firma al crear firmante
2. **`on_signature_completed`** - Notifica al owner y firmante cuando se firma
3. **`on_workflow_completed`** - Envía .ECO a todos cuando se completa

---

## 🔄 Flujo Completo

### 1. Creación del Workflow

**Frontend/API:**
```sql
-- Crear el workflow
INSERT INTO signature_workflows (
  owner_id,
  original_filename,
  status
) VALUES (
  'user-uuid',
  'Contrato de Servicios.pdf',
  'draft'
) RETURNING id;
```

### 2. Agregar Firmantes

**Frontend/API:**
```sql
-- Agregar firmante (esto dispara el trigger automáticamente)
INSERT INTO workflow_signers (
  workflow_id,
  email,
  name,
  signing_order,
  access_token_hash,
  status
) VALUES (
  'workflow-uuid',
  'invitado@example.com',
  'Juan Pérez',
  1,
  gen_random_uuid()::text,  -- Token único para el link
  'pending'
);
```

**Qué sucede automáticamente:**
- ✅ El trigger `on_signer_created` se ejecuta
- ✅ Se crea una notificación en `workflow_notifications` con estado `pending`
- ✅ El template HTML del email se genera automáticamente
- ✅ El link de firma es: `https://app.ecosign.app/sign/{access_token_hash}`

### 3. Envío de Emails

**Opción A: Cron Job (Recomendado)**
```bash
# Configurar en Supabase Dashboard → Edge Functions → Cron Jobs
# Ejecutar cada 5 minutos:
*/5 * * * * send-pending-emails
```

**Opción B: Manual/Testing**
```bash
curl -X POST \
  https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/send-pending-emails \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

**Qué sucede:**
- 📧 La función procesa hasta 10 emails pendientes
- ✅ Los emails se envían vía Resend API
- ✅ El estado cambia a `sent` con timestamp
- ❌ Si falla, marca como `failed` con error

### 4. Firmante Accede al Link

**URL:** `https://app.ecosign.app/sign/{token}`

**Frontend debe:**
1. Obtener el workflow y signer por `access_token_hash`
2. Mostrar el documento
3. Permitir firmar (si `status = 'ready'` o `'pending'`)

### 5. Firmante Completa la Firma

**Frontend/API:**
```sql
-- Marcar como firmado
UPDATE workflow_signers
SET
  status = 'signed',
  signed_at = NOW(),
  signature_data = '{"x": 100, "y": 200, "page": 1}',
  signature_hash = 'sha256-hash-of-signature'
WHERE id = 'signer-uuid';
```

**Qué sucede automáticamente:**
- ✅ El trigger `on_signature_completed` se ejecuta
- ✅ Se crean 2 notificaciones:
  - Una para el **owner** (te firmaron)
  - Una para el **firmante** (confirmación)
- ✅ Las notificaciones se agregan a la cola
- 📧 Se envían en el próximo run de `send-pending-emails`

### 6. Workflow Completo

**Cuando el último firmante firma:**

```sql
-- Marcar workflow como completado
UPDATE signature_workflows
SET
  status = 'completed',
  completed_at = NOW()
WHERE id = 'workflow-uuid';
```

**Qué sucede automáticamente:**
- ✅ El trigger `on_workflow_completed` se ejecuta
- ✅ Se crea una notificación para el **owner**
- ✅ Se crean notificaciones para **todos los firmantes**
- 📧 Todos reciben el link de descarga del .ECO
- ✅ Link de descarga: `https://app.ecosign.app/download/{workflow_id}/eco`

---

## 📧 Templates de Email

### 1. Link de Firma (Invitación)
**Tipo:** `your_turn_to_sign`
**Destinatario:** Firmante
**Cuándo:** Al crear `workflow_signer`

```
Asunto: 📄 Documento para firmar: {nombre_documento}
Botón: "Revisar y firmar documento"
Link: https://app.ecosign.app/sign/{token}
```

### 2. Firma Completada
**Tipo:** `signature_completed`
**Destinatarios:** Owner + Firmante
**Cuándo:** Al actualizar `workflow_signer` a `status='signed'`

Para el owner:
```
Asunto: ✍️ Firma completada: {nombre_documento}
Mensaje: {nombre} ({email}) completó su firma
```

Para el firmante:
```
Asunto: ✅ Tu firma fue registrada: {nombre_documento}
Mensaje: Tu firma fue registrada exitosamente
```

### 3. Documento Completado
**Tipo:** `workflow_completed`
**Destinatarios:** Owner + Todos los firmantes
**Cuándo:** Al actualizar `signature_workflows` a `status='completed'`

```
Asunto: ✅ Documento completado: {nombre_documento}
Botón: "Descargar certificado .ECO"
Link: https://app.ecosign.app/download/{workflow_id}/eco
```

---

## 🧪 Testing

### Test 1: Crear Workflow y Firmante

```sql
-- 1. Crear workflow
INSERT INTO signature_workflows (
  owner_id,
  original_filename,
  status
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'Test Document.pdf',
  'draft'
) RETURNING id;

-- 2. Agregar firmante (usa el ID del paso anterior)
INSERT INTO workflow_signers (
  workflow_id,
  email,
  name,
  signing_order,
  access_token_hash,
  status
) VALUES (
  'WORKFLOW_ID_AQUI',
  'test@example.com',
  'Test User',
  1,
  gen_random_uuid()::text,
  'pending'
);

-- 3. Verificar que se creó la notificación
SELECT * FROM workflow_notifications
WHERE workflow_id = 'WORKFLOW_ID_AQUI'
ORDER BY created_at DESC;
```

### Test 2: Enviar Emails Pendientes

```bash
# Llamar a la Edge Function
curl -X POST \
  https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/send-pending-emails \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Test 3: Simular Firma

```sql
-- Marcar como firmado
UPDATE workflow_signers
SET
  status = 'signed',
  signed_at = NOW()
WHERE email = 'test@example.com'
RETURNING *;

-- Verificar notificaciones creadas
SELECT * FROM workflow_notifications
ORDER BY created_at DESC
LIMIT 5;
```

### Test 4: Completar Workflow

```sql
-- Marcar workflow como completado
UPDATE signature_workflows
SET
  status = 'completed',
  completed_at = NOW()
WHERE original_filename = 'Test Document.pdf'
RETURNING *;

-- Verificar notificaciones de completado
SELECT
  notification_type,
  recipient_email,
  subject,
  delivery_status
FROM workflow_notifications
WHERE notification_type = 'workflow_completed'
ORDER BY created_at DESC;
```

---

## ⚙️ Configuración Requerida

### Variables de Entorno (Supabase)

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
FRONTEND_URL=https://app.ecosign.app
SUPABASE_URL=https://uiyojopjbhooxrmamaiw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Cron Job (Recomendado)

En **Supabase Dashboard → Edge Functions → Cron Jobs**:

```
Nombre: process-pending-emails
Schedule: */5 * * * * (cada 5 minutos)
Function: send-pending-emails
```

---

## 🐛 Troubleshooting

### Los emails no se envían

1. Verificar que las notificaciones existan:
```sql
SELECT * FROM workflow_notifications WHERE delivery_status = 'pending';
```

2. Verificar RESEND_API_KEY:
```bash
supabase secrets list
```

3. Ver logs de la Edge Function:
```bash
supabase functions logs send-pending-emails
```

### El trigger no se ejecuta

1. Verificar que el trigger existe:
```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name LIKE 'on_%';
```

2. Ver logs de PostgreSQL:
```sql
SELECT * FROM pg_stat_statements
WHERE query LIKE '%workflow_%'
ORDER BY calls DESC;
```

### Link de firma no funciona

1. Verificar que el `access_token_hash` esté en la URL
2. Verificar que el frontend busque por `access_token_hash`:
```sql
SELECT * FROM workflow_signers WHERE access_token_hash = 'TOKEN_AQUI';
```

---

## 📊 Monitoring

### Ver estadísticas de emails

```sql
-- Emails por estado
SELECT
  delivery_status,
  COUNT(*) as total
FROM workflow_notifications
GROUP BY delivery_status;

-- Emails fallidos recientes
SELECT
  recipient_email,
  subject,
  error_message,
  created_at
FROM workflow_notifications
WHERE delivery_status = 'failed'
ORDER BY created_at DESC
LIMIT 10;

-- Tasa de éxito de emails
SELECT
  ROUND(
    COUNT(*) FILTER (WHERE delivery_status = 'sent') * 100.0 /
    NULLIF(COUNT(*), 0),
    2
  ) as success_rate_percent
FROM workflow_notifications
WHERE delivery_status IN ('sent', 'failed');
```

---

## 🚀 Next Steps

1. ✅ Configurar Cron Job en Supabase Dashboard
2. ✅ Verificar RESEND_API_KEY está configurada
3. ✅ Actualizar FRONTEND_URL en Supabase Secrets
4. ✅ Implementar endpoints de firma en el frontend
5. ✅ Probar flujo completo end-to-end

---

## 📝 Notas

- Los triggers se ejecutan **automáticamente** en cada INSERT/UPDATE
- Los emails se envían de forma **asíncrona** vía cola
- El sistema es **idempotent** - puedes reintentar sin duplicados
- Los `access_token_hash` son únicos y no expiran (agregar expiración si necesario)

---

Última actualización: 2025-11-26
