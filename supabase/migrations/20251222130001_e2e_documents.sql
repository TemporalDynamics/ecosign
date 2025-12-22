-- ============================================
-- E2E Encryption: Documents Table
-- ============================================
-- Add columns for encrypted document storage

-- Add encryption metadata columns
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS encrypted BOOLEAN DEFAULT FALSE;

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS encrypted_path TEXT;

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS wrapped_key TEXT;

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS wrap_iv TEXT;

-- Add index for encrypted documents
CREATE INDEX IF NOT EXISTS idx_documents_encrypted 
ON documents(owner_id, encrypted) 
WHERE encrypted = TRUE;

-- Comments
COMMENT ON COLUMN documents.encrypted IS 'Whether this document is client-side encrypted (E2E)';
COMMENT ON COLUMN documents.encrypted_path IS 'Storage path for encrypted blob (if encrypted = true)';
COMMENT ON COLUMN documents.wrapped_key IS 'Document key wrapped with session unwrap key (base64). Server cannot unwrap without client secret.';
COMMENT ON COLUMN documents.wrap_iv IS 'IV used for key wrapping (hex string)';

-- RLS: Encrypted documents follow same ownership rules
-- (Existing RLS policies already cover this)
