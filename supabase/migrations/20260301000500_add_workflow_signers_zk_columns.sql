-- Add missing ZK-related columns required by start-signature-workflow.
-- These columns are already used by edge functions but were missing in schema migrations.

ALTER TABLE public.workflow_signers
  ADD COLUMN IF NOT EXISTS wrapped_key TEXT,
  ADD COLUMN IF NOT EXISTS wrap_iv TEXT,
  ADD COLUMN IF NOT EXISTS recipient_salt TEXT,
  ADD COLUMN IF NOT EXISTS key_mode TEXT NOT NULL DEFAULT 'legacy';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workflow_signers_key_mode_check'
      AND conrelid = 'public.workflow_signers'::regclass
  ) THEN
    ALTER TABLE public.workflow_signers
      ADD CONSTRAINT workflow_signers_key_mode_check
      CHECK (key_mode IN ('legacy', 'wrapped'));
  END IF;
END $$;

COMMENT ON COLUMN public.workflow_signers.wrapped_key IS
  'ZK mode: document key wrapped for this signer (base64).';
COMMENT ON COLUMN public.workflow_signers.wrap_iv IS
  'ZK mode: IV for wrapped_key.';
COMMENT ON COLUMN public.workflow_signers.recipient_salt IS
  'ZK mode: recipient salt used for OTP-derived key.';
COMMENT ON COLUMN public.workflow_signers.key_mode IS
  'Key material mode for signer access: legacy or wrapped.';
