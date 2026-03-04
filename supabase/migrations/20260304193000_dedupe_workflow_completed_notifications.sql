-- Ensure workflow_completed_simple notifications are idempotent by recipient.
-- 1) Remove duplicates (keep earliest) so unique index can be created safely.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY workflow_id, recipient_email, notification_type, step
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.workflow_notifications
  WHERE notification_type = 'workflow_completed_simple'
)
DELETE FROM public.workflow_notifications
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2) Enforce idempotency for workflow completed emails (owner + signers).
CREATE UNIQUE INDEX IF NOT EXISTS workflow_notifications_completed_unique
ON public.workflow_notifications (workflow_id, recipient_email, notification_type, step)
WHERE workflow_id IS NOT NULL
  AND recipient_email IS NOT NULL
  AND notification_type = 'workflow_completed_simple';

COMMENT ON INDEX public.workflow_notifications_completed_unique IS
  'Idempotent outbox key for workflow_completed_simple notifications.';
