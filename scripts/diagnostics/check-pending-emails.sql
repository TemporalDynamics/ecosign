-- Consulta para revisar workflow_notifications
SELECT
  id,
  workflow_id,
  recipient_email,
  recipient_type,
  signer_id,
  notification_type,
  subject,
  delivery_status,
  error_message,
  retry_count,
  created_at,
  sent_at,
  resend_email_id
FROM public.workflow_notifications
ORDER BY created_at DESC
LIMIT 200;
