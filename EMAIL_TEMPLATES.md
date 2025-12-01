# Email Templates y cron jobs (EcoSign)

## Cron jobs activos (SQL Editor)
Ya están listos en `setup-all-crons.sql`:
- `process-polygon-anchors` cada 1m
- `process-bitcoin-anchors` cada 5m
- `send-pending-emails` cada 1m

Verificación:
```sql
SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
```

## Plantillas HTML (inline, dark theme)
Ruta: `emails/templates/`
- `invitacion-a-firmar.html` — CTA para revisar/firmar, incluye expiración y código.
- `documento-certificado.html` — incluye hash, chain, tx, link a explorer y descarga.
- `documento-firmado.html` — confirma firma, firmante, fecha y hash.

Placeholders sugeridos: `{{documentName}}`, `{{actionUrl}}`, `{{expiresAt}}`, `{{verificationCode}}`, `{{documentHash}}`, `{{chainName}}`, `{{txHash}}`, `{{explorerUrl}}`, `{{downloadUrl}}`, `{{signerName}}`, `{{signerEmail}}`, `{{signedAt}}`.

## Cómo usar con workflow_notifications
Inserta `subject` y `body_html` renderizando la plantilla (reemplaza placeholders en tu backend). Ejemplo SQL simplificado:
```sql
INSERT INTO workflow_notifications (
  workflow_id, recipient_email, recipient_type,
  notification_type, subject, body_html, delivery_status
) VALUES (
  '...workflow_id...',
  'user@example.com',
  'owner',
  'signature_request',
  'Invitación a firmar',
  '<html>...html renderizado...</html>',
  'pending'
);
```

## Envío y reintentos
- Función `send-pending-emails` lee `workflow_notifications` con `delivery_status='pending'` y envía vía Resend.
- Reintentos: hasta 10 veces; luego marca `failed`. Si la cron corre cada minuto, el reintento se reprograma automáticamente.
- Campos usados: `recipient_email`, `subject`, `body_html`, `retry_count`, `delivery_status`, `error_message`, `resend_email_id`.

## Configuración necesaria
- Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `DEFAULT_FROM` (ej: `EcoSign <no-reply@ecosign.app>`).
- Dominio en Resend: validar SPF/DKIM para `ecosign.app` y usar el from deseado.

## Check rápido de la cola
```sql
SELECT id, notification_type, delivery_status, retry_count, created_at
FROM workflow_notifications
ORDER BY created_at DESC
LIMIT 20;
```
