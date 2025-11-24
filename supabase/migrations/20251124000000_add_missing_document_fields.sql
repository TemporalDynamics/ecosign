-- =====================================================
-- Migration: Add Missing Fields to user_documents
-- =====================================================
-- Adds fields expected by DocumentsPage.jsx UI

-- Add missing columns
ALTER TABLE user_documents
  ADD COLUMN IF NOT EXISTS overall_status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS bitcoin_status TEXT,
  ADD COLUMN IF NOT EXISTS download_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS eco_hash TEXT,
  ADD COLUMN IF NOT EXISTS eco_file_data BYTEA,
  ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT 'pdf',
  ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS has_polygon_anchor BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS polygon_anchor_id UUID,
  ADD COLUMN IF NOT EXISTS bitcoin_confirmed_at TIMESTAMPTZ;

-- Add check constraint for overall_status
ALTER TABLE user_documents
  DROP CONSTRAINT IF EXISTS check_overall_status;

ALTER TABLE user_documents
  ADD CONSTRAINT check_overall_status
  CHECK (overall_status IN ('draft', 'pending', 'pending_anchor', 'certified', 'rejected', 'expired', 'revoked'));

-- Add check constraint for status
ALTER TABLE user_documents
  DROP CONSTRAINT IF EXISTS check_status;

ALTER TABLE user_documents
  ADD CONSTRAINT check_status
  CHECK (status IN ('draft', 'sent', 'pending', 'signed', 'rejected', 'expired'));

-- Add check constraint for bitcoin_status
ALTER TABLE user_documents
  DROP CONSTRAINT IF EXISTS check_bitcoin_status;

ALTER TABLE user_documents
  ADD CONSTRAINT check_bitcoin_status
  CHECK (bitcoin_status IS NULL OR bitcoin_status IN ('pending', 'confirmed', 'failed'));

-- Add check constraint for file_type
ALTER TABLE user_documents
  DROP CONSTRAINT IF EXISTS check_file_type;

ALTER TABLE user_documents
  ADD CONSTRAINT check_file_type
  CHECK (file_type IN ('pdf', 'docx', 'img'));

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_user_documents_overall_status ON user_documents(overall_status);
CREATE INDEX IF NOT EXISTS idx_user_documents_status ON user_documents(status);
CREATE INDEX IF NOT EXISTS idx_user_documents_bitcoin_status ON user_documents(bitcoin_status) WHERE bitcoin_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_documents_last_event ON user_documents(last_event_at DESC);

-- Backfill eco_hash from document_hash for existing records
UPDATE user_documents
SET eco_hash = document_hash
WHERE eco_hash IS NULL;

-- Comments
COMMENT ON COLUMN user_documents.overall_status IS 'Combined status of document lifecycle (signatures + anchoring)';
COMMENT ON COLUMN user_documents.bitcoin_status IS 'Bitcoin anchoring status: pending, confirmed, failed';
COMMENT ON COLUMN user_documents.download_enabled IS 'Controls if .eco file can be downloaded (true after Bitcoin confirmation)';
COMMENT ON COLUMN user_documents.eco_hash IS 'SHA-256 hash of the complete ECO package';
COMMENT ON COLUMN user_documents.eco_file_data IS 'Complete .eco file data for deferred download';
COMMENT ON COLUMN user_documents.file_type IS 'Document file type: pdf, docx, img';
COMMENT ON COLUMN user_documents.last_event_at IS 'Timestamp of last event on this document';
COMMENT ON COLUMN user_documents.status IS 'Document signature status: draft, sent, pending, signed, rejected, expired';
COMMENT ON COLUMN user_documents.has_polygon_anchor IS 'Whether document is anchored on Polygon blockchain';
COMMENT ON COLUMN user_documents.polygon_anchor_id IS 'Reference to polygon anchor record';
COMMENT ON COLUMN user_documents.bitcoin_confirmed_at IS 'Timestamp when Bitcoin anchor was confirmed';
