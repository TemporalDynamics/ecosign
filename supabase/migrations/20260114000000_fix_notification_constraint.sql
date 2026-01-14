-- Fix: Add missing notification_type 'creator_detailed_notification' to constraint
-- This type is used by notify_creator_on_signature() trigger

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
    'other',
    -- Blockchain confirmations
    'polygon_confirmed',
    'bitcoin_confirmed',
    -- Signer/owner delivery
    'owner_document_signed',
    'signer_copy_ready',
    -- Welcome email
    'welcome_founder',
    -- Creator detailed notification (technical details for owner)
    'creator_detailed_notification'
  ));

COMMENT ON CONSTRAINT workflow_notifications_notification_type_check ON public.workflow_notifications IS
  'Allows all workflow notification types including creator detailed notifications with technical details';
