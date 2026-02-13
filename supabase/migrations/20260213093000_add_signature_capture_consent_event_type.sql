-- Add signature.capture.consent to canonical workflow_events event types
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workflow_events_event_type_check'
  ) THEN
    ALTER TABLE public.workflow_events DROP CONSTRAINT workflow_events_event_type_check;
  END IF;
END $$;

ALTER TABLE public.workflow_events
  ADD CONSTRAINT workflow_events_event_type_check
  CHECK (event_type IN (
    'workflow.created',
    'workflow.activated',
    'workflow.completed',
    'workflow.cancelled',
    'signer.invited',
    'signer.accessed',
    'signer.identity_confirmed',
    'signer.ready_to_sign',
    'signer.signed',
    'signer.cancelled',
    'signer.rejected',
    'otp.sent',
    'otp.verified',
    'document.change_requested',
    'document.change_resolved',
    'document.decrypted',
    'signature.applied',
    'signature.capture.consent',
    'fields.schema.committed',
    'signature.state.committed',
    'eco.snapshot.issued'
  ));
