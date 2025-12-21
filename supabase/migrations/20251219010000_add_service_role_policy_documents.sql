-- =====================================================
-- Migration: Service Role Policy for Documents Table
-- =====================================================
-- Purpose: Allow service_role to perform all operations on documents table
--          This is needed for:
--          - Tests: Create/cleanup test data
--          - Edge Functions: Admin operations
--          - Maintenance scripts: Backups, migrations
-- 
-- Security: service_role_key is never exposed to frontend
--           Users still protected by existing RLS policies
-- =====================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Service role can manage all documents" ON documents;
DROP POLICY IF EXISTS "Service role can read documents" ON documents;
DROP POLICY IF EXISTS "Service role can insert documents" ON documents;
DROP POLICY IF EXISTS "Service role can update documents" ON documents;
DROP POLICY IF EXISTS "Service role can delete documents" ON documents;

-- Create explicit policies for each command type
-- This ensures service_role has full access for all operations

-- SELECT policy
CREATE POLICY "Service role can read documents"
  ON documents FOR SELECT
  TO service_role
  USING (true);

-- INSERT policy
CREATE POLICY "Service role can insert documents"
  ON documents FOR INSERT
  TO service_role
  WITH CHECK (true);

-- UPDATE policy
CREATE POLICY "Service role can update documents"
  ON documents FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- DELETE policy
CREATE POLICY "Service role can delete documents"
  ON documents FOR DELETE
  TO service_role
  USING (true);

-- Add helpful comments to each policy
COMMENT ON POLICY "Service role can read documents" ON documents IS
  'Allows service_role (backend/tests) full read access to documents table.';

COMMENT ON POLICY "Service role can insert documents" ON documents IS
  'Allows service_role (backend/tests) to insert documents.';

COMMENT ON POLICY "Service role can update documents" ON documents IS
  'Allows service_role (backend/tests) to update documents.';

COMMENT ON POLICY "Service role can delete documents" ON documents IS
  'Allows service_role (backend/tests) to delete documents.';
