-- Fix: Allow service role to INSERT into anchors table
-- Edge Functions use service_role and need to insert anchor records

-- Add policy for service role to insert anchors
CREATE POLICY "Service role can insert anchors"
  ON anchors FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMENT ON POLICY "Service role can insert anchors" ON anchors IS
  'Allows Edge Functions (using service_role) to create anchor records for blockchain anchoring';
