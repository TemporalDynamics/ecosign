-- ============================================
-- Fix: document_shares RLS for user_documents
-- ============================================
-- The INSERT policy references documents.owner_id but
-- documents are in user_documents.user_id

-- Drop existing policies
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
    SELECT id FROM user_documents WHERE user_id = auth.uid()
  )
);

-- Owner can create shares for their documents
CREATE POLICY "Users can create shares for their documents"
ON document_shares
FOR INSERT
WITH CHECK (
  document_id IN (
    SELECT id FROM user_documents WHERE user_id = auth.uid()
  )
);

-- Service role can access all (for OTP verification edge function)
CREATE POLICY "Service role full access"
ON document_shares
FOR ALL
USING (auth.role() = 'service_role');
