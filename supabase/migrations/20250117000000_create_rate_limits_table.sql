-- Create rate_limits table for testing rate limiting functionality

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_timestamp 
ON rate_limits(key, timestamp);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do anything (for tests)
CREATE POLICY "Service role full access"
ON rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON TABLE rate_limits IS 'Table for tracking rate limiting requests - used in tests';
