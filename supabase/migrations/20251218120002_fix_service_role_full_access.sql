-- Fix: Give service_role full access to tables needed by Edge Functions
-- Service role should bypass RLS for critical operations

-- Allow service_role to read user_documents (needed by anchor functions)
CREATE POLICY "Service role can read user_documents"
  ON user_documents FOR SELECT
  TO service_role
  USING (true);

-- Allow service role to update user_documents (needed by anchor functions)
CREATE POLICY "Service role can update user_documents"
  ON user_documents FOR UPDATE
  TO service_role
  USING (true);

-- Allow service role to update anchors (for status updates)
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Service role can update anchors" ON anchors;

CREATE POLICY "Service role can update anchors"
  ON anchors FOR UPDATE
  TO service_role
  USING (true);

COMMENT ON POLICY "Service role can read user_documents" ON user_documents IS
  'Allows Edge Functions to read user documents for enrichment';

COMMENT ON POLICY "Service role can update user_documents" ON user_documents IS
  'Allows Edge Functions to update document status after anchoring';
