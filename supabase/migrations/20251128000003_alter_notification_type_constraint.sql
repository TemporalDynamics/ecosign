-- IMPORTANTE: revisar y ajustar la lista de valores permitidos según la app.
-- Primero obtener la constraint actual y revisarla antes de ejecutar.
-- Si la app usa 'signature_request', incluirlo; ejemplo abajo:
ALTER TABLE public.workflow_notifications
  DROP CONSTRAINT IF EXISTS workflow_notifications_notification_type_check;

ALTER TABLE public.workflow_notifications
  ADD CONSTRAINT workflow_notifications_notification_type_check
  CHECK (notification_type IN ('signature_request','signature_reminder','system','other'));
