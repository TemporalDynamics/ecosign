-- Extend workflow_notifications types with signature_evidence_ready
ALTER TABLE public.workflow_notifications
  DROP CONSTRAINT IF EXISTS workflow_notifications_notification_type_check;

ALTER TABLE public.workflow_notifications
  ADD CONSTRAINT workflow_notifications_notification_type_check
  CHECK (notification_type IN (
    -- Workflow lifecycle
    'workflow_started',
    'your_turn_to_sign',
    'signature_completed',
    'signature_evidence_ready',
    'change_requested',
    'change_accepted',
    'change_rejected',
    'new_version_ready',
    'workflow_completed',
    'workflow_cancelled',
    -- Generic/system
    'signature_request',
    'signature_reminder',
    'system',
    'other',
    -- Blockchain confirmations
    'polygon_confirmed',
    'bitcoin_confirmed'
  ));

COMMENT ON CONSTRAINT workflow_notifications_notification_type_check ON public.workflow_notifications IS
  'Allows workflow lifecycle, evidence-ready, generic/system notifications, and blockchain confirmations.';
