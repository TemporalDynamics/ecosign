-- Presential non-repudiation hardening (trenza + canonical acta envelope)
-- - Persist attestation chain over snapshot_hash
-- - Persist canonical acta envelope/hash/timestamps for verifier consumption

BEGIN;

ALTER TABLE public.presential_verification_sessions
  ADD COLUMN IF NOT EXISTS trenza_attestations JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.presential_verification_sessions
  ADD COLUMN IF NOT EXISTS acta_payload JSONB;

ALTER TABLE public.presential_verification_sessions
  ADD COLUMN IF NOT EXISTS acta_hash TEXT;

ALTER TABLE public.presential_verification_sessions
  ADD COLUMN IF NOT EXISTS acta_timestamps JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_presential_acta_hash
  ON public.presential_verification_sessions(acta_hash)
  WHERE acta_hash IS NOT NULL;

COMMENT ON COLUMN public.presential_verification_sessions.trenza_attestations IS
  'Append-only attestations over snapshot_hash (signers/witnesses) for non-repudiation session evidence.';

COMMENT ON COLUMN public.presential_verification_sessions.acta_payload IS
  'Canonical JSON envelope for presential non-repudiation acta.';

COMMENT ON COLUMN public.presential_verification_sessions.acta_hash IS
  'SHA-256 hash of canonical acta payload.';

COMMENT ON COLUMN public.presential_verification_sessions.acta_timestamps IS
  'Timestamp evidences for acta_hash (local and external TSA when available).';

COMMIT;
