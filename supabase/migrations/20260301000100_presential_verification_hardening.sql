-- Presential verification hardening (P0)
-- - Enforce session expiration via expires_at
-- - Persist signer OTP challenges for real validation
-- - Create/normalize presential sessions table in a forward-only migration

BEGIN;

CREATE TABLE IF NOT EXISTS public.presential_verification_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  qr_code TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed', 'expired')),
  snapshot_hash TEXT NOT NULL,
  snapshot_data JSONB NOT NULL,
  confirmations JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.presential_verification_sessions
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE public.presential_verification_sessions
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '30 minutes');

UPDATE public.presential_verification_sessions
SET expires_at = COALESCE(expires_at, created_at + INTERVAL '30 minutes');

ALTER TABLE public.presential_verification_sessions
  ALTER COLUMN expires_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_presential_operation_id
  ON public.presential_verification_sessions(operation_id);

CREATE INDEX IF NOT EXISTS idx_presential_session_id
  ON public.presential_verification_sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_presential_status
  ON public.presential_verification_sessions(status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_presential_created_at
  ON public.presential_verification_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_presential_expires_at
  ON public.presential_verification_sessions(expires_at);

CREATE TABLE IF NOT EXISTS public.presential_verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.presential_verification_sessions(id) ON DELETE CASCADE,
  signer_email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  verified_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, signer_email)
);

CREATE INDEX IF NOT EXISTS idx_presential_otps_session_signer
  ON public.presential_verification_otps(session_id, signer_email);

CREATE INDEX IF NOT EXISTS idx_presential_otps_expires_at
  ON public.presential_verification_otps(expires_at);

COMMENT ON TABLE public.presential_verification_sessions IS
  'Presential verification sessions with explicit expiration and immutable snapshot hash.';

COMMENT ON COLUMN public.presential_verification_sessions.expires_at IS
  'Hard expiration timestamp for active presential verification sessions.';

COMMENT ON TABLE public.presential_verification_otps IS
  'Session-scoped OTP challenges used for presential signer confirmation.';

COMMENT ON COLUMN public.presential_verification_otps.signer_email IS
  'Normalized signer email bound to snapshot signer identity.';

COMMIT;
