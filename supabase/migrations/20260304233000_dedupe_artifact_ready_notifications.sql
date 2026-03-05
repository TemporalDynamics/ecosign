-- Ensure artifact_ready notifications are idempotent by recipient.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY workflow_id, recipient_email, notification_type, step
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.workflow_notifications
  WHERE notification_type = 'artifact_ready'
)
DELETE FROM public.workflow_notifications
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS workflow_notifications_artifact_ready_unique
ON public.workflow_notifications (workflow_id, recipient_email, notification_type, step)
WHERE workflow_id IS NOT NULL
  AND recipient_email IS NOT NULL
  AND notification_type = 'artifact_ready';

COMMENT ON INDEX public.workflow_notifications_artifact_ready_unique IS
  'Idempotent outbox key for artifact_ready notifications.';
