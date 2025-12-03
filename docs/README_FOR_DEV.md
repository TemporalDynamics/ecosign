# Paquete diagnóstico y parches - EcoSign (para el dev)

## Objetivo
- Hacer que el flujo de envío de emails funcione de forma robusta:
  - Validar Resend (API + dominio)
  - Asegurar que las filas en `workflow_notifications` se procesen correctamente
  - Añadir retry_count si hace falta
  - Ajustar constraint de `notification_type` si es necesario
  - Reforzar logs para detectar errores

## Archivos incluidos
- supabase/functions/_shared/email.ts
- supabase/functions/send-pending-emails/index.ts
- test-resend-email.js
- check-pending-emails.sql
- test-send-pending.sh
- migrations/ensure-uuid-extension.sql
- migrations/add-retry-count.sql
- migrations/alter-notification-type-constraint.sql
- quick_steps.txt

## Variables de entorno requeridas (Edge Functions)
- RESEND_API_KEY (clave con Sending access)
- SUPABASE_URL (opcional si se crea el client)
- SUPABASE_SERVICE_ROLE (service role key para actualizaciones desde la function)
- DEFAULT_FROM (ej: 'EcoSign <no-reply@email.ecosign.app>')

## Pasos recomendados (ejecutar en staging primero)
1. Revisar la constraint actual de `notification_type` y decidir si hay que permitir `signature_request` u otros valores. (Si no se quiere cambiar constraint, asegurar que create-signer-link inserte un valor válido).
2. Aplicar migraciones:
   - migrations/ensure-uuid-extension.sql
   - migrations/add-retry-count.sql
   - adaptar y aplicar migrations/alter-notification-type-constraint.sql sólo si se confirma la lista de valores permitidos.
3. Reemplazar la función send-pending-emails por la versión incluida y desplegar.
4. Confirmar que RESEND_API_KEY esté cargada en Settings → Edge Functions → Environment variables.
5. Probar:
   a) Ejecutar `node test-resend-email.js <tu_email>` con la RESEND_API_KEY.  
   b) Insertar manualmente una fila pending (o ejecutar la acción en el frontend) y verificar que aparezca en `workflow_notifications`.  
   c) Invocar send-pending-emails (desde UI o CLI) y revisar logs / actualización de la fila (`delivery_status` -> `sent` o `failed` con `error_message`).
6. Revisar logs de create-signer-link para asegurar que la inserción a `workflow_notifications` ocurra correctamente y que `notification_type` tenga un valor válido.
