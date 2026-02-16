-- ========================================
-- ZK Mode for Signers - Zero Knowledge Migration
-- Adds wrapped_key infrastructure to workflow_signers
-- Date: 2026-02-16
-- ========================================

-- Add ZK columns to workflow_signers
ALTER TABLE workflow_signers
ADD COLUMN IF NOT EXISTS wrapped_key TEXT,
ADD COLUMN IF NOT EXISTS wrap_iv TEXT,
ADD COLUMN IF NOT EXISTS recipient_salt TEXT,
ADD COLUMN IF NOT EXISTS key_mode TEXT DEFAULT 'legacy';

-- Add key_mode to signature_workflows (for owner documents)
ALTER TABLE signature_workflows
ADD COLUMN IF NOT EXISTS key_mode TEXT DEFAULT 'legacy';

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_workflow_signers_key_mode ON workflow_signers(key_mode);
CREATE INDEX IF NOT EXISTS idx_signature_workflows_key_mode ON signature_workflows(key_mode);

-- Comment
COMMENT ON COLUMN workflow_signers.wrapped_key IS 'Document key wrapped with signer-specific KEK (ZK mode)';
COMMENT ON COLUMN workflow_signers.wrap_iv IS 'IV for wrapped key unwrapping';
COMMENT ON COLUMN workflow_signers.recipient_salt IS 'Salt for OTP-derived KEK';
COMMENT ON COLUMN workflow_signers.key_mode IS 'Key mode: wrapped (ZK) or legacy (server-side encryption)';
