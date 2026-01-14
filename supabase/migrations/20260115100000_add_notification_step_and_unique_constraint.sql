-- Migration: Add 'step' column to workflow_notifications for idempotency and policy control
-- Implements DoD for F0.2 - Notification Pipeline

-- 1. Add the new 'step' column with a default 'primary'
ALTER TABLE public.workflow_notifications
ADD COLUMN step TEXT NOT NULL DEFAULT 'primary';

-- 2. Add a CHECK constraint for canonical step values (as per your recommendation)
ALTER TABLE public.workflow_notifications
ADD CONSTRAINT workflow_notifications_step_check
CHECK (step IN (
  'primary',
  'reminder_1',
  'reminder_2',
  'completion_notice'
));

-- 3. Add the refined UNIQUE constraint for true idempotency
ALTER TABLE public.workflow_notifications
ADD CONSTRAINT unq_workflow_signer_notification_step
UNIQUE (workflow_id, signer_id, notification_type, step);

COMMENT ON COLUMN public.workflow_notifications.step IS 'Identifies the step in a notification sequence (e.g., initial invite vs reminder). Used for idempotency.';
COMMENT ON CONSTRAINT unq_workflow_signer_notification_step ON public.workflow_notifications IS 'Ensures a notification for a specific step is only created once per workflow/signer.';
