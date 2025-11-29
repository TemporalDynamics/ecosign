-- Fix notification_type constraint to include workflow events used by the app
-- This replaces the overly restrictive constraint introduced in a prior migration
-- and restores the original workflow_* values plus signature reminders/system.

ALTER TABLE public.workflow_notifications
  DROP CONSTRAINT IF EXISTS workflow_notifications_notification_type_check;

ALTER TABLE public.workflow_notifications
  ADD CONSTRAINT workflow_notifications_notification_type_check
  CHECK (notification_type IN (
    -- Workflow lifecycle
    'workflow_started',
    'your_turn_to_sign',
    'signature_completed',
    'change_requested',
    'change_accepted',
    'change_rejected',
    'new_version_ready',
    'workflow_completed',
    'workflow_cancelled',
    -- Generic/other
    'signature_request',
    'signature_reminder',
    'system',
    'other'
  ));

COMMENT ON CONSTRAINT workflow_notifications_notification_type_check ON public.workflow_notifications IS
  'Allows workflow lifecycle notifications plus generic signature/system types.';
