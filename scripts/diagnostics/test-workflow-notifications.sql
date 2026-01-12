-- Script para verificar las notificaciones de workflow
-- Ejecutar en Supabase SQL Editor

-- Ver todas las notificaciones pendientes
SELECT
  id,
  workflow_id,
  recipient_email,
  recipient_type,
  notification_type,
  subject,
  delivery_status,
  retry_count,
  error_message,
  created_at,
  sent_at
FROM workflow_notifications
WHERE delivery_status = 'pending'
ORDER BY created_at DESC
LIMIT 20;

-- Ver notificaciones fallidas con errores
SELECT
  id,
  recipient_email,
  notification_type,
  delivery_status,
  retry_count,
  error_message,
  created_at
FROM workflow_notifications
WHERE delivery_status = 'failed' OR error_message IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Resetear notificaciones fallidas a pending (solo para testing)
-- DESCOMENTAR solo si quieres reintentar envío
-- UPDATE workflow_notifications
-- SET delivery_status = 'pending',
--     retry_count = 0,
--     error_message = NULL
-- WHERE delivery_status = 'failed';
