-- ============================================
-- E2E Encryption: Document Shares Table
-- ============================================
-- Table for OTP-based document sharing

CREATE TABLE IF NOT EXISTS document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Document reference
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Recipient info
  recipient_email TEXT NOT NULL,
  
  -- Wrapped key (encrypted with OTP-derived key)
  wrapped_key TEXT NOT NULL,
  wrap_iv TEXT NOT NULL,
  recipient_salt TEXT NOT NULL, -- Salt for OTP key derivation
  
  -- OTP (hashed, never stored in plaintext)
  otp_hash TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accessed', 'expired')),
  
  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,
  accessed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT unique_pending_share UNIQUE (document_id, recipient_email, status)
);

-- Indexes
CREATE INDEX idx_document_shares_document 
ON document_shares(document_id);

CREATE INDEX idx_document_shares_recipient 
ON document_shares(recipient_email, status);

CREATE INDEX idx_document_shares_otp 
ON document_shares(otp_hash) 
WHERE status = 'pending';

CREATE INDEX idx_document_shares_expires 
ON document_shares(expires_at) 
WHERE status = 'pending';

-- RLS Policies
ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;

-- Drop policies if exist (for idempotency)
DROP POLICY IF EXISTS "Users can view shares of their documents" ON document_shares;
DROP POLICY IF EXISTS "Users can create shares for their documents" ON document_shares;
DROP POLICY IF EXISTS "Service role full access" ON document_shares;

-- Owner can see all shares of their documents
CREATE POLICY "Users can view shares of their documents"
ON document_shares
FOR SELECT
USING (
  created_by = auth.uid()
  OR 
  document_id IN (
    SELECT id FROM documents WHERE owner_id = auth.uid()
  )
);

-- Owner can create shares
CREATE POLICY "Users can create shares for their documents"
ON document_shares
FOR INSERT
WITH CHECK (
  document_id IN (
    SELECT id FROM documents WHERE owner_id = auth.uid()
  )
);

-- Service role can access all (for OTP verification edge function)
CREATE POLICY "Service role full access"
ON document_shares
FOR ALL
USING (auth.role() = 'service_role');

-- Drop trigger and function if exist (for idempotency)
DROP TRIGGER IF EXISTS auto_expire_shares ON document_shares;
DROP FUNCTION IF EXISTS expire_document_shares();

-- Auto-expire shares function
CREATE FUNCTION expire_document_shares()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE document_shares
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-expire on each access check
CREATE TRIGGER auto_expire_shares
AFTER SELECT ON document_shares
FOR EACH STATEMENT
EXECUTE FUNCTION expire_document_shares();

-- Comments
COMMENT ON TABLE document_shares IS 'OTP-based document sharing for E2E encrypted documents';
COMMENT ON COLUMN document_shares.wrapped_key IS 'Document key wrapped with OTP-derived key';
COMMENT ON COLUMN document_shares.otp_hash IS 'SHA-256 hash of OTP (never store plaintext)';
COMMENT ON COLUMN document_shares.recipient_salt IS 'Public salt for OTP key derivation';
