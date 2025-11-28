-- Revisar emails pendientes en la cola
SELECT
  id,
  recipient_email,
  subject,
  delivery_status,
  error_message,
  created_at,
  sent_at
FROM workflow_notifications
WHERE delivery_status = 'pending'
ORDER BY created_at DESC
LIMIT 10;

-- Ver todos los emails (pendientes, enviados y fallidos)
SELECT
  delivery_status,
  COUNT(*) as total
FROM workflow_notifications
GROUP BY delivery_status;

-- Ver los últimos 5 emails fallidos con el error
SELECT
  id,
  recipient_email,
  subject,
  delivery_status,
  error_message,
  created_at
FROM workflow_notifications
WHERE delivery_status = 'failed'
ORDER BY created_at DESC
LIMIT 5;
