-- ============================================
-- Add NDA support to document_shares
-- ============================================

-- Add NDA fields to document_shares table
ALTER TABLE document_shares
ADD COLUMN IF NOT EXISTS nda_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS nda_text TEXT,
ADD COLUMN IF NOT EXISTS nda_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS nda_acceptance_metadata JSONB;

-- Index for NDA tracking
CREATE INDEX IF NOT EXISTS idx_document_shares_nda
ON document_shares(nda_enabled, nda_accepted_at)
WHERE nda_enabled = true;

-- Comments
COMMENT ON COLUMN document_shares.nda_enabled IS 'Whether NDA acceptance is required before access';
COMMENT ON COLUMN document_shares.nda_text IS 'Full NDA text presented to recipient';
COMMENT ON COLUMN document_shares.nda_accepted_at IS 'When recipient accepted the NDA';
COMMENT ON COLUMN document_shares.nda_acceptance_metadata IS 'Metadata about NDA acceptance (hash, IP, user-agent, etc)';
