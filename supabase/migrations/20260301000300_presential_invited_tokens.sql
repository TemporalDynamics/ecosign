-- Presential non-repudiation invited participant tokens
-- - Allow participant confirmation without Supabase account session
-- - Bind participant token hash to session-scoped OTP challenge

BEGIN;

ALTER TABLE public.presential_verification_otps
  ADD COLUMN IF NOT EXISTS participant_id TEXT;

ALTER TABLE public.presential_verification_otps
  ADD COLUMN IF NOT EXISTS participant_role TEXT
  CHECK (participant_role IN ('signer', 'witness'));

ALTER TABLE public.presential_verification_otps
  ADD COLUMN IF NOT EXISTS participant_token_hash TEXT;

ALTER TABLE public.presential_verification_otps
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

ALTER TABLE public.presential_verification_otps
  ADD COLUMN IF NOT EXISTS token_revoked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_presential_otps_session_token_hash
  ON public.presential_verification_otps(session_id, participant_token_hash)
  WHERE participant_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_presential_otps_session_participant
  ON public.presential_verification_otps(session_id, participant_id)
  WHERE participant_id IS NOT NULL;

COMMENT ON COLUMN public.presential_verification_otps.participant_id IS
  'Snapshot participant identifier for presential non-repudiation sessions.';

COMMENT ON COLUMN public.presential_verification_otps.participant_role IS
  'Participant role in the session snapshot: signer or witness.';

COMMENT ON COLUMN public.presential_verification_otps.participant_token_hash IS
  'SHA-256 hash of session-scoped participant access token used by invited participants.';

COMMENT ON COLUMN public.presential_verification_otps.token_expires_at IS
  'Hard expiration timestamp for participant token access.';

COMMENT ON COLUMN public.presential_verification_otps.token_revoked_at IS
  'Revocation timestamp for participant token access.';

COMMIT;
