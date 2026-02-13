-- Add structural hashes for EPI-ready evidence

ALTER TABLE public.signature_workflows
  ADD COLUMN IF NOT EXISTS fields_schema_hash TEXT,
  ADD COLUMN IF NOT EXISTS fields_schema_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS fields_schema_committed_at TIMESTAMPTZ;

ALTER TABLE public.workflow_signers
  ADD COLUMN IF NOT EXISTS signer_state_hash TEXT,
  ADD COLUMN IF NOT EXISTS signer_state_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS signer_state_committed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signature_capture_hash TEXT;

COMMENT ON COLUMN public.signature_workflows.fields_schema_hash IS
  'Canonical hash of the committed field schema (CanonicalFieldSchemaV1).';
COMMENT ON COLUMN public.signature_workflows.fields_schema_version IS
  'Schema version for fields_schema_hash.';
COMMENT ON COLUMN public.signature_workflows.fields_schema_committed_at IS
  'Timestamp when fields_schema_hash was computed.';

COMMENT ON COLUMN public.workflow_signers.signer_state_hash IS
  'Canonical hash of signer state (CanonicalSignerStateV1).';
COMMENT ON COLUMN public.workflow_signers.signer_state_version IS
  'Schema version for signer_state_hash.';
COMMENT ON COLUMN public.workflow_signers.signer_state_committed_at IS
  'Timestamp when signer_state_hash was computed.';
COMMENT ON COLUMN public.workflow_signers.signature_capture_hash IS
  'Hash of the signature capture payload (typed/drawn/upload).';
