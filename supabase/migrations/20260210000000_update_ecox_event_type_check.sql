-- Update ECOX event_type check constraint to include canonical dot-notation events

ALTER TABLE public.ecox_audit_trail
  DROP CONSTRAINT IF EXISTS ecox_audit_trail_event_type_check;

ALTER TABLE public.ecox_audit_trail
  ADD CONSTRAINT ecox_audit_trail_event_type_check CHECK (event_type IN (
    'access_link_opened',
    'nda_accepted',
    'nda.accepted',
    'mfa_challenged',
    'mfa_success',
    'mfa_failed',
    'otp.sent',
    'otp.verified',
    'document_decrypted',
    'document_viewed',
    'document_view_duration',
    'signature_started',
    'signature_applied',
    'signature_completed',
    'eco_downloaded',
    'sequential_order_violated'
  ));
