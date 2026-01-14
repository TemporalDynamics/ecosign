-- Migration: Add token lifecycle and encrypted secret columns to workflow_signers
-- Implements DoD for F0.4 - Secure Token Model Remediation (Revision 2)

-- 1. Add columns for token expiration, revocation, and encrypted secret
ALTER TABLE public.workflow_signers
ADD COLUMN token_expires_at TIMESTAMPTZ NOT NULL,
ADD COLUMN token_revoked_at TIMESTAMPTZ,
ADD COLUMN access_token_ciphertext TEXT NOT NULL,
ADD COLUMN access_token_nonce TEXT NOT NULL;

COMMENT ON COLUMN public.workflow_signers.token_expires_at IS 'The timestamp when the access token is no longer valid. Must be set.';
COMMENT ON COLUMN public.workflow_signers.token_revoked_at IS 'The timestamp when the access token was explicitly revoked (e.g., by reissuing).';
COMMENT ON COLUMN public.workflow_signers.access_token_ciphertext IS 'AES-GCM ciphertext of the raw access token.';
COMMENT ON COLUMN public.workflow_signers.access_token_nonce IS 'The nonce (IV) used for the AES-GCM encryption of the token.';

-- 2. Add an index for looking up expired but not-yet-processed tokens (optional but good for cron jobs)
CREATE INDEX IF NOT EXISTS idx_signers_token_expires_at ON public.workflow_signers (token_expires_at)
WHERE token_revoked_at IS NULL AND status = 'invited';
