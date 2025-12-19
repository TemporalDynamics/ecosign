# Manual Deployment Steps - Welcome Email System

El deployment automático falló por problemas con Docker/SELinux. Aquí están los pasos para completar el deployment manualmente desde el Dashboard.

## ✅ Completado

- [x] Migración aplicada (`20251219000000_welcome_email_system.sql`)
- [x] Tabla `welcome_email_queue` creada
- [x] Trigger `trigger_queue_welcome_email` configurado
- [x] Función `process_welcome_email_queue()` lista

## 📋 Pasos Pendientes (Dashboard)

### 1. Actualizar Edge Function `send-pending-emails`

**Dashboard URL**: https://supabase.com/dashboard/project/uiyojopjbhooxrmamaiw/functions/send-pending-emails/details

**Pasos**:
1. Ir a: **Edge Functions** → **send-pending-emails** → **Edit**
2. Buscar la línea (aproximadamente línea 5):
   ```typescript
   import { sendResendEmail } from '../_shared/email.ts';
   ```
3. Reemplazar con:
   ```typescript
   import { sendResendEmail, buildFounderWelcomeEmail } from '../_shared/email.ts';
   ```

4. Buscar el loop `for (const r of rows)` (aproximadamente línea 32)
5. Reemplazar el contenido del loop con este código actualizado:

```typescript
    for (const r of rows) {
      try {
        const from = Deno.env.get('DEFAULT_FROM') ?? 'EcoSign <no-reply@email.ecosign.app>';
        const to = r.recipient_email;
        let subject = r.subject || 'Notificación EcoSign';
        let html = r.body_html || '<p>Notificación</p>';

        // Special handling for welcome_founder emails - generate HTML dynamically
        if (r.notification_type === 'welcome_founder') {
          const siteUrl = Deno.env.get('SITE_URL') || 'https://ecosign.app';
          const userName = r.metadata?.userName || to.split('@')[0];

          const welcomeEmail = buildFounderWelcomeEmail({
            userEmail: to,
            userName,
            dashboardUrl: `${siteUrl}/dashboard`,
            docsUrl: `${siteUrl}/docs`,
            supportUrl: `${siteUrl}/support`
          });

          subject = welcomeEmail.subject;
          html = welcomeEmail.html;
        }

        const result = await sendResendEmail({ from, to, subject, html });

        if (result.ok) {
          const upd = await supabase
            .from('workflow_notifications')
            .update({
              delivery_status: 'sent',
              sent_at: new Date().toISOString(),
              resend_email_id: result.id ?? null,
              error_message: null,
            })
            .eq('id', r.id);

          if (upd.error) console.error('Error actualizando a sent:', upd.error);
          else console.info(`Email enviado fila ${r.id} resend_id ${result.id}`);
        } else {
          const retry = (r.retry_count ?? 0) + 1;
          const new_status = retry >= MAX_RETRIES ? 'failed' : 'pending';
          const upd = await supabase
            .from('workflow_notifications')
            .update({
              delivery_status: new_status,
              error_message: JSON.stringify(result.error ?? result.body ?? 'Unknown error'),
              retry_count: retry,
            })
            .eq('id', r.id);

          console.error(`Error enviando email fila ${r.id}:`, result.error ?? result.body);
          if (upd.error) console.error('Error actualizando fila error:', upd.error);
        }
      } catch (innerErr) {
        console.error('Excepción procesando fila:', innerErr);
      }
    }
```

6. **Deploy** la función actualizada

---

### 2. Actualizar `_shared/email.ts`

**Dashboard URL**: https://supabase.com/dashboard/project/uiyojopjbhooxrmamaiw/functions/_shared/details

**Opción A: Agregar al final del archivo**

Buscar el final del archivo (después de `buildDocumentCertifiedEmail`) y agregar:

```typescript
export function buildFounderWelcomeEmail({
  userEmail,
  userName,
  dashboardUrl = 'https://ecosign.app/dashboard',
  docsUrl = 'https://ecosign.app/docs',
  supportUrl = 'https://ecosign.app/support'
}: {
  userEmail: string;
  userName?: string | null;
  dashboardUrl?: string;
  docsUrl?: string;
  supportUrl?: string;
}) {
  const name = userName || userEmail.split('@')[0];

  return {
    from: DEFAULT_FROM,
    to: userEmail,
    subject: 'Bienvenido a EcoSign',
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      background-color: #ffffff;
      color: #0f172a;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      padding: 48px 32px 32px;
      border-bottom: 1px solid #e5e7eb;
    }
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      color: #000000;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
    }
    .header p {
      font-size: 16px;
      color: #64748b;
      line-height: 1.5;
    }
    .badge-container {
      padding: 24px 32px;
      background-color: #fafafa;
      border-bottom: 1px solid #e5e7eb;
    }
    .founder-badge {
      display: inline-block;
      border: 2px solid #000000;
      color: #000000;
      padding: 8px 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .badge-subtitle {
      margin-top: 12px;
      font-size: 13px;
      color: #64748b;
    }
    .content {
      padding: 40px 32px;
    }
    .content h2 {
      font-size: 20px;
      font-weight: 600;
      color: #000000;
      margin-bottom: 20px;
    }
    .content p {
      font-size: 15px;
      color: #475569;
      margin-bottom: 16px;
      line-height: 1.7;
    }
    .content strong {
      color: #0f172a;
      font-weight: 600;
    }
    .benefits {
      background-color: #fafafa;
      border-left: 2px solid #000000;
      padding: 24px;
      margin: 32px 0;
    }
    .benefits h3 {
      font-size: 15px;
      font-weight: 600;
      color: #000000;
      margin-bottom: 16px;
    }
    .benefits ul {
      list-style: none;
      padding: 0;
    }
    .benefits li {
      padding: 6px 0;
      padding-left: 20px;
      position: relative;
      font-size: 14px;
      color: #475569;
      line-height: 1.6;
    }
    .benefits li:before {
      content: "—";
      position: absolute;
      left: 0;
      color: #000000;
      font-weight: 600;
    }
    .cta-button {
      display: inline-block;
      background-color: #000000;
      color: #ffffff;
      padding: 14px 32px;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      margin: 32px 0;
      transition: background-color 0.2s;
    }
    .cta-button:hover {
      background-color: #1f2937;
    }
    .security-note {
      background-color: #fafafa;
      border: 1px solid #e5e7eb;
      padding: 20px;
      margin: 32px 0;
    }
    .security-note h4 {
      font-size: 14px;
      font-weight: 600;
      color: #000000;
      margin-bottom: 8px;
    }
    .security-note p {
      font-size: 13px;
      color: #64748b;
      margin: 0;
      line-height: 1.6;
    }
    .footer {
      background-color: #fafafa;
      padding: 32px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      font-size: 13px;
      color: #64748b;
      margin: 8px 0;
    }
    .footer a {
      color: #0f172a;
      text-decoration: none;
      font-weight: 500;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 32px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <h1>Bienvenido a EcoSign</h1>
      <p>Tu sistema de certificación forense de documentos</p>
    </div>

    <!-- Founder Badge -->
    <div class="badge-container">
      <div class="founder-badge">FOUNDER</div>
      <p class="badge-subtitle">
        Como usuario fundador, sos parte de la construcción de EcoSign
      </p>
    </div>

    <!-- Main Content -->
    <div class="content">
      <h2>Hola ${name},</h2>

      <p>
        Acabás de dar el primer paso hacia un sistema que te permite <strong>proteger tus documentos con certeza legal y técnica</strong>.
      </p>

      <p>
        EcoSign combina criptografía, timestamps legales RFC 3161 y anclaje blockchain para garantizar que tus documentos sean verificables, inmutables y válidos como evidencia.
      </p>

      <div class="divider"></div>

      <!-- Benefits -->
      <div class="benefits">
        <h3>Qué podés hacer ahora</h3>
        <ul>
          <li>Certificar documentos con firma criptográfica y timestamp legal</li>
          <li>Anclar en blockchain (Polygon y Bitcoin) para inmutabilidad</li>
          <li>Enviar documentos a firmar con SignNow (eIDAS, ESIGN, UETA)</li>
          <li>Verificar certificados .ECO offline con criptografía pública</li>
          <li>Descargar evidencia forense aceptable en tribunales</li>
        </ul>
      </div>

      <!-- Security Note -->
      <div class="security-note">
        <h4>Arquitectura Zero-Knowledge</h4>
        <p>
          Tus documentos nunca se almacenan en nuestros servidores. Solo generamos hashes criptográficos y certificados de integridad. Vos controlás completamente tus archivos.
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${dashboardUrl}" class="cta-button">Ir al Dashboard</a>
      </div>

      <p style="text-align: center; color: #64748b; font-size: 13px;">
        ¿Tenés dudas? Respondé este email o visitá nuestra <a href="${docsUrl}" style="color: #0f172a;">documentación</a>.
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="font-weight: 600; color: #000000; margin-bottom: 12px;">
        EcoSign
      </p>
      <p>
        <a href="${dashboardUrl}">Dashboard</a> •
        <a href="${docsUrl}">Documentación</a> •
        <a href="${supportUrl}">Soporte</a>
      </p>
      <p style="margin-top: 16px; font-size: 12px;">
        Este email fue enviado a ${userEmail} porque creaste una cuenta en EcoSign.
      </p>
      <p style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
        © 2025 EcoSign
      </p>
    </div>
  </div>
</body>
</html>
    `,
  };
}
```

**Opción B: Copiar archivo completo desde repositorio**

Si preferís, podés copiar el contenido completo del archivo desde:
`supabase/functions/_shared/email.ts` (local)

---

### 3. Crear Cron Job

**Dashboard URL**: https://supabase.com/dashboard/project/uiyojopjbhooxrmamaiw/database/extensions

**Pasos**:
1. Ir a: **Database** → **SQL Editor**
2. Click en **New query**
3. Pegar este código:

```sql
SELECT cron.schedule(
  'process-welcome-emails',
  '*/1 * * * *',
  'SELECT public.process_welcome_email_queue();'
);
```

4. **Run** la query
5. Verificar que se creó:

```sql
SELECT * FROM cron.job WHERE jobname = 'process-welcome-emails';
```

---

### 4. Verificar Variable de Entorno `SITE_URL`

**Dashboard URL**: https://supabase.com/dashboard/project/uiyojopjbhooxrmamaiw/settings/functions

**Pasos**:
1. Ir a: **Settings** → **Edge Functions** → **Manage secrets**
2. Verificar que existe: `SITE_URL=https://ecosign.app`
3. Si no existe, agregarlo

**Variables necesarias**:
- ✅ `RESEND_API_KEY` (ya existe)
- ✅ `DEFAULT_FROM` (ya existe)
- ⚠️ `SITE_URL` (verificar)

---

## 🧪 Testing

Después de completar todos los pasos:

### Test 1: Verificar Trigger

```sql
-- Simular confirmación de email
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'test@ecosign.app'
  AND email_confirmed_at IS NULL;

-- Verificar que se agregó a la cola
SELECT * FROM welcome_email_queue
WHERE user_email = 'test@ecosign.app';
```

### Test 2: Procesar Cola Manualmente

```sql
-- Ejecutar procesamiento de cola
SELECT process_welcome_email_queue();

-- Verificar que se creó la notificación
SELECT * FROM workflow_notifications
WHERE notification_type = 'welcome_founder'
  AND recipient_email = 'test@ecosign.app';
```

### Test 3: Verificar Email Enviado

Esperar 1 minuto (el cron corre cada minuto) y verificar:

```sql
SELECT
  recipient_email,
  notification_type,
  subject,
  delivery_status,
  sent_at,
  error_message
FROM workflow_notifications
WHERE notification_type = 'welcome_founder'
ORDER BY created_at DESC
LIMIT 5;
```

---

## ✅ Checklist Final

- [ ] `send-pending-emails` actualizado (import + loop)
- [ ] `_shared/email.ts` tiene `buildFounderWelcomeEmail()`
- [ ] Cron job `process-welcome-emails` creado
- [ ] Variable `SITE_URL` configurada
- [ ] Test con usuario nuevo completado
- [ ] Email de bienvenida recibido correctamente

---

**Una vez completados todos los pasos, el sistema de bienvenida estará 100% funcional.**
