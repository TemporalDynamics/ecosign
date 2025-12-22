# Email Templates Map

Version: v1.0
Estado: activo

## Regla oficial (perimetro)

Todo email de producto debe:
- Usar template en `supabase/functions/_shared/templates/`
- Renderizarse via `supabase/functions/_shared/template-renderer.ts`
- Inyectar `siteUrl` desde el renderer

Cualquier excepcion se considera legacy o tactica.

## Checklist tecnico minimo
- Ninguna edge function nueva manda HTML inline "oficial".
- `supabase/functions/_shared/template-renderer.ts` es el unico renderer permitido para emails de producto.
- `siteUrl` siempre se inyecta desde el renderer (sin hardcode).
- Las plantillas viven dentro del bundle en `supabase/functions/_shared/templates/`.

## Estado del sistema
Este sistema se considera cerrado (v1). Cualquier nuevo email de producto debe registrarse en `decision_log2.0.md` antes de implementarse.

## Templates en archivos (sistema oficial)

Para Edge Functions, las plantillas se duplican en:
`supabase/functions/_shared/templates/`
El renderer oficial vive en:
`supabase/functions/_shared/template-renderer.ts`

| Template | Ubicacion | Motor | Uso | Estado |
| --- | --- | --- | --- | --- |
| verify-email.html | supabase/templates | Supabase Auth | Verificacion de cuenta (Confirm Signup) | Activo |
| founder-welcome.html | supabase/templates | Custom renderer | Bienvenida Founder (welcome_founder) | Activo (referencia del sistema) |
| firmante-invitacion.html | client/email-templates | Custom renderer | Invitacion a firmar | Pendiente (sin uso detectado en codigo) |
| firmante-confirmacion.html | client/email-templates | Custom renderer | Copia firmada para firmante | Pendiente (sin uso detectado en codigo) |
| firmante-otp.html | client/email-templates | Custom renderer | Codigo OTP | Pendiente (sin uso detectado en codigo) |
| firmante-reenvio.html | client/email-templates | Custom renderer | Reenvio de link para firmar | Pendiente (sin uso detectado en codigo) |
| owner-flujo-creado.html | client/email-templates | Custom renderer | Workflow creado | Pendiente (sin uso detectado en codigo) |
| owner-firma-recibida.html | client/email-templates | Custom renderer | Firma recibida | Pendiente (sin uso detectado en codigo) |
| owner-acceso-vencido.html | client/email-templates | Custom renderer | Link vencido | Pendiente (sin uso detectado en codigo) |
| owner-link-REENVIO.html | client/email-templates | Custom renderer | Reenvio para owner | Pendiente (sin uso detectado en codigo) |
| invitacion-a-firmar.html | emails/templates | Custom renderer | Invitacion a firmar | Legacy (sin uso detectado en codigo) |
| documento-firmado.html | emails/templates | Custom renderer | Documento firmado | Legacy (sin uso detectado en codigo) |
| documento-certificado.html | emails/templates | Custom renderer | Documento certificado | Legacy (sin uso detectado en codigo) |
| documento-firmado-resumen.html | supabase/functions/_shared/templates | Custom renderer | Documento firmado (resumen owner) | Activo |
| documento-certificado-resumen.html | supabase/functions/_shared/templates | Custom renderer | Documento certificado (resumen) | Activo |

## Renderer central (supabase/functions/_shared/email.ts)

| Builder | Uso | Consumidor |
| --- | --- | --- |
| buildSignerInvitationEmail | Invitacion a firmar | supabase/functions/generate-link, supabase/functions/create-signer-link |
| buildSignerOtpEmail | Codigo OTP para firmar | supabase/functions/send-signer-otp |
| buildSignerPackageEmail | Copia firmada para firmante | supabase/functions/send-signer-package |
| buildDocumentSignedEmail | Notificacion al owner | supabase/functions/notify-document-signed |
| buildDocumentCertifiedEmail | Documento certificado | supabase/functions/notify-document-certified |
| buildFounderWelcomeEmail | Bienvenida Founder | supabase/functions/send-welcome-email, supabase/functions/send-pending-emails |

## HTML inline (legacy/tactico, fuera de esta iteracion)

Estos flujos generan `body_html` directamente en funciones/migraciones:

| Ubicacion | Flujo |
| --- | --- |
| supabase/functions/process-signature/index.ts | Notificaciones de firma (owner_document_signed, signer_copy_ready, workflow_completed, your_turn_to_sign) |
| supabase/functions/start-signature-workflow/index.ts | Creacion de workflow (invite signer) |
| supabase/functions/signnow-webhook/index.ts | Notificaciones desde SignNow |
| supabase/functions/request-document-changes/index.ts | Solicitud de cambios en documento |
| supabase/functions/respond-to-changes/index.ts | Respuesta a cambios de documento |
| supabase/functions/process-polygon-anchors/index.ts | Confirmacion de anclaje Polygon |
| supabase/functions/process-bitcoin-anchors/index.ts | Confirmacion de anclaje Bitcoin + correo directo |
| supabase/functions/test-insert-notification/index.ts | Email de prueba de dominio |
| supabase/migrations/20251201150000_update_notify_link_expired_and_resend.sql | Actualizaciones de templates en workflow_notifications |
| supabase/migrations/20251201140000_update_notify_signature_completed_templates.sql | Templates de firma completada |
| supabase/migrations/20251126000000_guest_signature_workflow_automation.sql | Templates de workflow guest |
| supabase/migrations/20251127000000_ecox_audit_trail_and_creator_notifications.sql | Notificaciones de audit trail |
