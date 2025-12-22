# Guía de Plantillas de Email - EcoSign

## 📧 Sistema de Emails - Arquitectura

### Flujo Completo

```
Evento (ej: firma completada)
    ↓
Función Edge crea notificación
    ↓
INSERT en workflow_notifications
    - recipient_email
    - subject (renderizado)
    - body_html (renderizado desde plantilla)
    - delivery_status: 'pending'
    ↓
Cron ejecuta send-pending-emails (cada 1 min)
    ↓
Lee workflow_notifications WHERE delivery_status='pending'
    ↓
Envía via Resend API
    ↓
Actualiza delivery_status: 'sent' o 'failed'
```

---

## 📁 Plantillas Disponibles

### Ubicación: `client/email-templates/`

| Plantilla | Uso | Variables |
|-----------|-----|-----------|
| **firmante-invitacion.html** | Invitar a firmar | `{{signerName}}`, `{{documentName}}`, `{{signLink}}`, `{{ownerName}}` |
| **firmante-confirmacion.html** | Confirmar firma | `{{signerName}}`, `{{documentName}}`, `{{certificateLink}}` |
| **firmante-otp.html** | Código OTP | `{{otpCode}}`, `{{expiresIn}}` |
| **firmante-reenvio.html** | Reenvío de link | `{{signerName}}`, `{{signLink}}` |
| **owner-flujo-creado.html** | Workflow creado | `{{ownerName}}`, `{{documentName}}`, `{{trackingLink}}` |
| **owner-firma-recibida.html** | Firma recibida | `{{ownerName}}`, `{{signerName}}`, `{{documentName}}` |
| **owner-acceso-vencido.html** | Link vencido | `{{ownerName}}`, `{{signerEmail}}`, `{{documentName}}` |
| **owner-link-REENVIO.html** | Reenvío para owner | `{{ownerName}}`, `{{newLink}}` |

### Ubicación alternativa: `emails/templates/`

| Plantilla | Uso | Variables |
|-----------|-----|-----------|
| **invitacion-a-firmar.html** | Invitación básica | `{{recipientName}}`, `{{documentName}}`, `{{signatureLink}}`, `{{senderName}}` |
| **documento-certificado.html** | Certificación | `{{userName}}`, `{{documentName}}`, `{{verificationLink}}`, `{{downloadLink}}` |

---

## 🔧 Cómo Usar las Plantillas

### Variables globales (importante)

Para templates custom (las que rendereamos nosotros), normalizamos `{{siteUrl}}` como base para assets y links.
En cambio, los templates de Supabase Auth usan `{{ .SiteURL }}` y no deben modificarse.

Ejemplo:
- Custom: `<img src="{{siteUrl}}/assets/icons/icon-128x128.png" />`
- Supabase Auth: `<img src="{{ .SiteURL }}/assets/icons/icon-128x128.png" />`

### Renderer oficial para templates custom

Los templates custom se renderizan con el helper:
`supabase/functions/_shared/template-renderer.ts`

Para que funcionen en Edge Functions, las plantillas deben existir en:
`supabase/functions/_shared/templates/`

`siteUrl` se inyecta siempre como parte del contrato base.

### Paso 1: Cargar la Plantilla

```typescript
// Ejemplo en una Edge Function
import { readFileSync } from 'fs'; // En Deno usa Deno.readTextFile

// Opción A: Desde client/email-templates/
const templatePath = './client/email-templates/firmante-invitacion.html';
const template = await Deno.readTextFile(templatePath);

// Opción B: Template inline (para Edge Functions)
const template = `
<!DOCTYPE html>
<html>
<body>
  <h1>Hola {{signerName}}</h1>
  <p>Te invitamos a firmar: {{documentName}}</p>
  <a href="{{signLink}}">Firmar ahora</a>
</body>
</html>
`;
```

### Paso 2: Renderizar la Plantilla

```typescript
function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;

  // Reemplazar cada variable
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replaceAll(placeholder, value);
  }

  return rendered;
}

// Uso
const html = renderTemplate(template, {
  signerName: 'Juan Pérez',
  documentName: 'Contrato de Servicios.pdf',
  signLink: 'https://ecosign.app/sign/abc123',
  ownerName: 'María García'
});
```

### Paso 3: Insertar en workflow_notifications

```typescript
// En la función que crea el workflow o evento
const { error } = await supabase
  .from('workflow_notifications')
  .insert({
    recipient_email: signer.email,
    notification_type: 'signer_invite',
    subject: `Te invitan a firmar: ${documentName}`,
    body_html: html, // ← HTML renderizado
    delivery_status: 'pending',
    workflow_id: workflowId,
    metadata: {
      signerId: signer.id,
      documentId: doc.id
    }
  });
```

### Paso 4: El Cron Envía Automáticamente

```typescript
// send-pending-emails hace esto automáticamente
const { data: pending } = await supabase
  .from('workflow_notifications')
  .select('*')
  .eq('delivery_status', 'pending')
  .limit(50);

for (const notification of pending) {
  await sendResendEmail({
    from: 'EcoSign <no-reply@ecosign.app>',
    to: notification.recipient_email,
    subject: notification.subject,
    html: notification.body_html // ← Ya está renderizado
  });
}
```

---

## 📝 Ejemplo Completo: Invitación a Firmar

```typescript
// En start-signature-workflow/index.ts

import { renderTemplate } from '../_shared/templates.ts';

// 1. Cargar plantilla (o usar inline)
const inviteTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .button {
      background: #4CAF50;
      color: white;
      padding: 15px 32px;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <h1>Hola {{signerName}},</h1>

  <p>{{ownerName}} te invita a firmar el documento:</p>
  <p><strong>{{documentName}}</strong></p>

  <p>
    <a href="{{signLink}}" class="button">
      Firmar Ahora
    </a>
  </p>

  <p style="color: #666; font-size: 12px;">
    Este link expira en 7 días.
  </p>

  <hr>
  <p style="font-size: 10px; color: #999;">
    EcoSign - Certificación Forense de Documentos
  </p>
</body>
</html>
`;

// 2. Renderizar con datos reales
const html = renderTemplate(inviteTemplate, {
  signerName: signer.name || signer.email,
  ownerName: owner.name || owner.email,
  documentName: documentName,
  signLink: `https://ecosign.app/sign/${accessToken}`
});

// 3. Insertar notificación
await supabase
  .from('workflow_notifications')
  .insert({
    recipient_email: signer.email,
    notification_type: 'signer_invite',
    subject: `${owner.name} te invita a firmar: ${documentName}`,
    body_html: html,
    delivery_status: 'pending',
    workflow_id: workflow.id,
    signer_id: signer.id
  });

// 4. ¡El cron enviará automáticamente!
```

---

## 🎨 Variables Comunes

### Para Firmantes

```typescript
{
  signerName: string,        // Nombre del firmante
  signerEmail: string,       // Email del firmante
  documentName: string,      // Nombre del documento
  signLink: string,          // Link único para firmar
  ownerName: string,         // Quién envió la invitación
  expiresAt: string,         // Fecha de expiración
  otpCode?: string,          // Código OTP (si aplica)
  ndaRequired: boolean       // Si debe aceptar NDA
}
```

### Para Owners

```typescript
{
  ownerName: string,         // Nombre del dueño
  ownerEmail: string,        // Email del dueño
  documentName: string,      // Nombre del documento
  signerName: string,        // Quién firmó
  signerEmail: string,       // Email del firmante
  trackingLink: string,      // Link para ver progreso
  certificateLink: string,   // Link al certificado
  downloadLink: string       // Link de descarga
}
```

### Para Anchoring

```typescript
{
  userName: string,          // Nombre del usuario
  documentName: string,      // Nombre del documento
  anchorType: string,        // 'polygon' | 'bitcoin'
  txHash: string,            // Hash de transacción
  explorerUrl: string,       // Link al explorer
  blockNumber: number,       // Número de bloque
  confirmationTime: string   // Timestamp de confirmación
}
```

---

## 🔐 Configuración de Resend

### Variables de Entorno Necesarias

```bash
# En Supabase Secrets
RESEND_API_KEY=re_xxx...  # ✅ Ya configurada
DEFAULT_FROM=EcoSign <no-reply@ecosign.app>  # ⚠️ Falta configurar
```

### Configurar DEFAULT_FROM

```bash
# Opción 1: CLI
supabase secrets set DEFAULT_FROM="EcoSign <no-reply@ecosign.app>"

# Opción 2: Dashboard
# Ir a: Settings → Edge Functions → Manage secrets
# Name: DEFAULT_FROM
# Value: EcoSign <no-reply@ecosign.app>
```

### Verificar Dominio en Resend

**CRÍTICO para evitar que los emails vayan a spam:**

1. **Ir a Resend Dashboard:** https://resend.com/domains
2. **Add Domain:** `ecosign.app`
3. **Configurar DNS Records:**

   ```
   Tipo   | Nombre              | Valor
   -------|---------------------|----------------------------------
   TXT    | @                   | v=spf1 include:_spf.resend.com ~all
   TXT    | resend._domainkey   | [valor proporcionado por Resend]
   CNAME  | resend._domainkey   | [valor proporcionado por Resend]
   ```

4. **Verificar:** Resend verificará automáticamente (puede tardar 15-60 min)

5. **Status esperado:**
   - SPF: ✅ Verified
   - DKIM: ✅ Verified
   - Domain: ✅ Active

---

## 📊 Tipos de Notificaciones

```typescript
// En workflow_notifications.notification_type

type NotificationType =
  | 'signer_invite'           // Invitación inicial
  | 'signer_reminder'         // Recordatorio
  | 'signer_otp'              // Código OTP
  | 'signer_completed'        // Confirmación de firma
  | 'owner_workflow_created'  // Workflow creado
  | 'owner_signature_received' // Firma recibida
  | 'owner_link_expired'      // Link vencido
  | 'polygon_confirmed'       // Anchor Polygon confirmado
  | 'bitcoin_confirmed';      // Anchor Bitcoin confirmado
```

---

## 🧪 Testing de Emails

### Probar Manualmente

```bash
# 1. Crear notificación de prueba
curl -X POST "https://uiyojopjbhooxrmamaiw.supabase.co/rest/v1/workflow_notifications" \
  -H "apikey: YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_email": "test@ecosign.app",
    "notification_type": "signer_invite",
    "subject": "Test: Invitación a Firmar",
    "body_html": "<h1>Test Email</h1><p>Este es un email de prueba.</p>",
    "delivery_status": "pending"
  }'

# 2. Ejecutar worker manualmente
curl -X POST "https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/send-pending-emails"

# 3. Verificar en workflow_notifications que cambió a 'sent'
```

### Ver Emails Enviados

```sql
-- En SQL Editor
SELECT
  recipient_email,
  notification_type,
  subject,
  delivery_status,
  sent_at,
  error_message
FROM workflow_notifications
ORDER BY created_at DESC
LIMIT 20;
```

---

## ⚠️ Troubleshooting

### Email no llega

**1. Verificar que está en pending:**
```sql
SELECT * FROM workflow_notifications
WHERE delivery_status = 'pending';
```

**2. Verificar que el cron está activo:**
```sql
SELECT * FROM cron.job WHERE jobname = 'send-pending-emails';
```

**3. Ver errores:**
```sql
SELECT * FROM workflow_notifications
WHERE delivery_status = 'failed';
```

**4. Ver logs:**
```bash
supabase functions logs send-pending-emails
```

### Email va a spam

- ⚠️ **Dominio NO verificado en Resend**
  - Solución: Verificar dominio (pasos arriba)

- ⚠️ **Usando dirección no verificada**
  - Solución: Usar `no-reply@ecosign.app` verificado

- ⚠️ **Contenido sospechoso**
  - Evitar: ALL CAPS, muchos !!!, URLs acortadas
  - Usar: Formato HTML profesional, firma, unsubscribe

### Variables no se reemplazan

- ❌ **Olvidaste renderizar la plantilla**
  ```typescript
  // INCORRECTO
  body_html: template  // ← Variables sin reemplazar

  // CORRECTO
  body_html: renderTemplate(template, variables)
  ```

---

## 📋 Checklist de Implementación

Para cada tipo de notificación:

- [ ] Crear plantilla HTML en `client/email-templates/`
- [ ] Documentar variables necesarias
- [ ] Implementar función `renderTemplate()` si no existe
- [ ] En la Edge Function que genera el evento:
  - [ ] Cargar plantilla
  - [ ] Renderizar con variables
  - [ ] INSERT en `workflow_notifications`
- [ ] Probar manualmente
- [ ] Verificar que el cron envía automáticamente

---

## 🚀 Próximos Pasos

### Para MVP (Hacer Ahora)

1. ✅ ~~Desplegar send-pending-emails~~
2. ⚠️ Configurar `DEFAULT_FROM` en Secrets
3. ⚠️ Configurar cron (SQL ya está en `setup-all-crons.sql`)
4. ⚠️ Verificar dominio `ecosign.app` en Resend

### Post-MVP (Mejoras)

1. Crear función helper `renderTemplate()` compartida
2. Agregar soporte para Markdown → HTML
3. Implementar unsubscribe links
4. Agregar tracking de opens/clicks (Resend Webhooks)
5. A/B testing de subject lines
6. Templates con variables de i18n (multiidioma)

---

## 🎯 Uso Actual en el Código

### start-signature-workflow

```typescript
// Actualmente: Genera HTML inline
// TODO: Usar plantilla firmante-invitacion.html

const html = renderTemplate(inviteTemplate, {
  signerName: signer.name,
  documentName: originalFilename,
  signLink: `https://ecosign.app/sign/${accessToken}`,
  ownerName: user.email
});

await supabase.from('workflow_notifications').insert({
  recipient_email: signer.email,
  notification_type: 'signer_invite',
  subject: `Te invitan a firmar: ${originalFilename}`,
  body_html: html,
  delivery_status: 'pending'
});
```

### process-polygon-anchors

```typescript
// Cuando confirma un anchor
await supabase.from('workflow_notifications').insert({
  recipient_email: userEmail,
  notification_type: 'polygon_confirmed',
  subject: `Documento anclado en Polygon`,
  body_html: renderTemplate(polygonConfirmedTemplate, {
    userName: userEmail,
    txHash: receipt.hash,
    explorerUrl: `https://polygonscan.com/tx/${receipt.hash}`,
    blockNumber: receipt.blockNumber
  }),
  delivery_status: 'pending'
});
```

---

**¿Necesitas más ejemplos o ayuda con algún caso específico?**
