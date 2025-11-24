-- =====================================================
-- Migration: Secure Events RLS
-- =====================================================
-- Restricts direct client inserts to events table
-- Only edge functions (SERVICE_ROLE) can insert events
-- This ensures forensic chain of custody integrity

-- Drop existing INSERT policy (if any)
DROP POLICY IF EXISTS "Anyone can insert events" ON events;
DROP POLICY IF EXISTS "Users can insert events" ON events;
DROP POLICY IF EXISTS "Authenticated users can insert events" ON events;

-- CREATE RESTRICTIVE INSERT POLICY
-- This policy DENIES all direct client inserts
-- Only SERVICE_ROLE (edge functions) can bypass this
CREATE POLICY "Block direct client inserts on events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Keep SELECT policies for users to view their document events
DROP POLICY IF EXISTS "Users can view events for their documents" ON events;

CREATE POLICY "Users can view events for their documents"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_documents
      WHERE user_documents.id = events.document_id
        AND user_documents.user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON POLICY "Block direct client inserts on events" ON events IS
  'Prevents client-side tampering. Only edge functions with SERVICE_ROLE can insert events.';

COMMENT ON POLICY "Users can view events for their documents" ON events IS
  'Users can view events for documents they own';

-- Verify RLS is enabled
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Log migration success
DO $$
BEGIN
  RAISE NOTICE '✅ Events table RLS secured - only SERVICE_ROLE can insert';
END $$;
