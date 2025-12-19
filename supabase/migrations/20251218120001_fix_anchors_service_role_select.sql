-- Fix: Allow service role to SELECT from anchors table
-- Edge Functions need to read anchor records after inserting them

-- Add policy for service role to select anchors
CREATE POLICY "Service role can select anchors"
  ON anchors FOR SELECT
  TO service_role
  USING (true);

COMMENT ON POLICY "Service role can select anchors" ON anchors IS
  'Allows Edge Functions (using service_role) to read anchor records';
