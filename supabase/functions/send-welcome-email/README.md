# Welcome Email System

Sistema automatizado para enviar emails de bienvenida con insignia "Founder" a nuevos usuarios después de verificar su email.

## 🎯 Flujo Completo

```
Usuario registra cuenta
    ↓
Usuario verifica email (click en link)
    ↓
auth.users.email_confirmed_at actualiza (NULL → timestamp)
    ↓
Trigger SQL: queue_welcome_email()
    ↓
INSERT en welcome_email_queue (status='pending')
    ↓
Cron (cada 1 min): process_welcome_email_queue()
    ↓
INSERT en workflow_notifications (tipo='welcome_founder')
    ↓
Cron (cada 1 min): send-pending-emails
    ↓
Detecta notification_type='welcome_founder'
    ↓
Genera HTML con buildFounderWelcomeEmail()
    ↓
Envía vía Resend API
    ↓
Usuario recibe email con badge FOUNDER 👑
```

---

## 📁 Archivos Involucrados

### 1. Template HTML
- **Ubicación**: `supabase/templates/founder-welcome.html`
- **Propósito**: Template standalone (reference)

### 2. Edge Function
- **Ubicación**: `supabase/functions/send-welcome-email/index.ts`
- **Propósito**: Enviar email de bienvenida (puede ser llamado directamente o vía queue)

### 3. Email Builder
- **Ubicación**: `supabase/functions/_shared/email.ts`
- **Función**: `buildFounderWelcomeEmail()`
- **Propósito**: Genera HTML del email dinámicamente

### 4. Migración SQL
- **Ubicación**: `supabase/migrations/20251219000000_welcome_email_system.sql`
- **Crea**:
  - Tabla `welcome_email_queue`
  - Trigger `trigger_queue_welcome_email` en `auth.users`
  - Función `process_welcome_email_queue()`

### 5. Worker Modificado
- **Ubicación**: `supabase/functions/send-pending-emails/index.ts`
- **Cambios**: Detecta `notification_type='welcome_founder'` y genera HTML dinámicamente

---

## 🚀 Deployment

### 1. Aplicar Migración

```bash
# Local
supabase db reset

# Producción
supabase db push
```

### 2. Configurar Cron Job

**IMPORTANTE**: El cron job NO se crea automáticamente. Debes crearlo manualmente.

**Opción A: Dashboard**
1. Ir a **SQL Editor** en Supabase Dashboard
2. Ejecutar:

```sql
SELECT cron.schedule(
  'process-welcome-emails',
  '*/1 * * * *', -- Every 1 minute
  $$
  SELECT public.process_welcome_email_queue();
  $$
);
```

**Opción B: CLI**

```bash
supabase sql <<EOF
SELECT cron.schedule(
  'process-welcome-emails',
  '*/1 * * * *',
  \$\$
  SELECT public.process_welcome_email_queue();
  \$\$
);
EOF
```

### 3. Verificar Cron Job

```sql
-- Ver todos los cron jobs
SELECT * FROM cron.job WHERE jobname = 'process-welcome-emails';

-- Ver logs de ejecución
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-welcome-emails')
ORDER BY start_time DESC
LIMIT 10;
```

### 4. Desplegar Edge Functions

```bash
# Deploy send-pending-emails (si tiene cambios)
supabase functions deploy send-pending-emails

# Deploy send-welcome-email (opcional - usado vía queue)
supabase functions deploy send-welcome-email
```

### 5. Configurar Variables de Entorno

**Necesarias en Supabase Dashboard → Settings → Edge Functions → Manage secrets:**

```bash
RESEND_API_KEY=re_xxx...
DEFAULT_FROM=EcoSign <notificaciones@ecosign.app>
SITE_URL=https://ecosign.app
```

---

## 🧪 Testing

### Test 1: Verificar Trigger

```sql
-- Simular confirmación de email (en desarrollo)
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'test@example.com'
  AND email_confirmed_at IS NULL;

-- Verificar que se agregó a la cola
SELECT * FROM public.welcome_email_queue
WHERE user_email = 'test@example.com';
```

### Test 2: Procesar Cola Manualmente

```sql
-- Ejecutar procesamiento de cola
SELECT public.process_welcome_email_queue();

-- Verificar que se creó la notificación
SELECT * FROM public.workflow_notifications
WHERE notification_type = 'welcome_founder'
  AND recipient_email = 'test@example.com';
```

### Test 3: Enviar Email Manualmente

```bash
# Ejecutar send-pending-emails
curl -X POST "https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/send-pending-emails" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Test 4: Verificar Email Enviado

```sql
-- Ver notificaciones enviadas
SELECT
  recipient_email,
  notification_type,
  subject,
  delivery_status,
  sent_at,
  error_message
FROM public.workflow_notifications
WHERE notification_type = 'welcome_founder'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📊 Monitoreo

### Ver Cola de Bienvenida

```sql
SELECT
  user_email,
  user_name,
  status,
  attempts,
  error_message,
  created_at,
  sent_at
FROM public.welcome_email_queue
ORDER BY created_at DESC
LIMIT 20;
```

### Ver Emails Pendientes

```sql
SELECT COUNT(*)
FROM public.welcome_email_queue
WHERE status = 'pending';
```

### Ver Emails Fallidos

```sql
SELECT *
FROM public.welcome_email_queue
WHERE status = 'failed'
ORDER BY created_at DESC;
```

---

## 🛠️ Troubleshooting

### Email no se envía

**1. Verificar que el usuario confirmó su email:**
```sql
SELECT email, email_confirmed_at
FROM auth.users
WHERE email = 'user@example.com';
```

**2. Verificar que está en la cola:**
```sql
SELECT * FROM public.welcome_email_queue
WHERE user_email = 'user@example.com';
```

**3. Verificar que se creó la notificación:**
```sql
SELECT * FROM public.workflow_notifications
WHERE recipient_email = 'user@example.com'
  AND notification_type = 'welcome_founder';
```

**4. Ver logs del cron:**
```sql
SELECT *
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-welcome-emails')
ORDER BY start_time DESC
LIMIT 5;
```

**5. Ejecutar manualmente:**
```sql
SELECT public.process_welcome_email_queue();
```

### Email se envía múltiples veces

- **Causa**: Falta constraint UNIQUE en `welcome_email_queue(user_id)`
- **Solución**: Ya incluido en migración - solo permite 1 email por usuario

### Usuario no recibe email

1. **Verificar en spam**
2. **Verificar dominio Resend**: Debe estar verificado en https://resend.com/domains
3. **Ver logs de Resend**: Dashboard → Logs
4. **Verificar variables de entorno**: `RESEND_API_KEY`, `DEFAULT_FROM`

---

## 🎨 Personalización

### Cambiar Template

Editar `buildFounderWelcomeEmail()` en `supabase/functions/_shared/email.ts`

```typescript
export function buildFounderWelcomeEmail({ ... }) {
  return {
    from: DEFAULT_FROM,
    to: userEmail,
    subject: '👑 Bienvenido a EcoSign - Usuario Fundador',
    html: `
      <!-- Tu HTML aquí -->
    `
  };
}
```

### Cambiar Frecuencia de Cron

```sql
-- Cambiar a cada 5 minutos
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'process-welcome-emails'),
  schedule := '*/5 * * * *'
);
```

### Deshabilitar Temporalmente

```sql
-- Pausar cron
SELECT cron.unschedule('process-welcome-emails');

-- Reactivar
SELECT cron.schedule(
  'process-welcome-emails',
  '*/1 * * * *',
  $$SELECT public.process_welcome_email_queue();$$
);
```

---

## 📋 Checklist de Implementación

- [ ] Migración aplicada (`supabase db push`)
- [ ] Cron job creado (ver paso 2 arriba)
- [ ] Variables de entorno configuradas (`RESEND_API_KEY`, `DEFAULT_FROM`, `SITE_URL`)
- [ ] Dominio verificado en Resend
- [ ] Edge function `send-pending-emails` desplegada
- [ ] Probado con usuario de prueba
- [ ] Email recibido correctamente
- [ ] Logs verificados (sin errores)

---

## 🎯 Próximos Pasos

### Mejoras Futuras

1. **A/B Testing**: Probar diferentes subject lines
2. **Segmentación**: Diferentes mensajes según plan/tipo de usuario
3. **Métricas**: Tracking de opens/clicks con Resend Webhooks
4. **i18n**: Soporte multiidioma
5. **Onboarding**: Agregar emails de onboarding (día 3, día 7, etc.)

---

**¿Necesitas ayuda?** Revisá los logs o escribí a soporte.
