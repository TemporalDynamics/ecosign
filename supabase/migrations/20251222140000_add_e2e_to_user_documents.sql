-- ============================================
-- E2E Encryption: Add columns to user_documents
-- ============================================
-- Add E2E encryption columns to user_documents table

-- Add encryption metadata columns
ALTER TABLE user_documents
ADD COLUMN IF NOT EXISTS encrypted BOOLEAN DEFAULT FALSE;

ALTER TABLE user_documents
ADD COLUMN IF NOT EXISTS encrypted_path TEXT;

ALTER TABLE user_documents
ADD COLUMN IF NOT EXISTS wrapped_key TEXT;

ALTER TABLE user_documents
ADD COLUMN IF NOT EXISTS wrap_iv TEXT;

-- Add index for encrypted documents
CREATE INDEX IF NOT EXISTS idx_user_documents_encrypted
ON user_documents(user_id, encrypted)
WHERE encrypted = TRUE;

-- Comments
COMMENT ON COLUMN user_documents.encrypted IS 'Whether this document is client-side encrypted (E2E)';
COMMENT ON COLUMN user_documents.encrypted_path IS 'Storage path for encrypted blob (if encrypted = true)';
COMMENT ON COLUMN user_documents.wrapped_key IS 'Document key wrapped with session unwrap key (base64). Server cannot unwrap without client secret.';
COMMENT ON COLUMN user_documents.wrap_iv IS 'IV used for key wrapping (hex string)';
