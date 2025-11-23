-- ========================================
-- Rate limiting persistence tables
-- ========================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_timestamp ON rate_limits(key, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_timestamp ON rate_limits(timestamp);

CREATE TABLE IF NOT EXISTS rate_limit_blocks (
  key TEXT PRIMARY KEY,
  blocked_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_blocks_until ON rate_limit_blocks(blocked_until);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cron.schedule') THEN
    PERFORM cron.schedule(
      'cleanup-rate-limits',
      '*/15 * * * *',
      $cleanup$
        DELETE FROM rate_limits WHERE timestamp < NOW() - INTERVAL '1 hour';
        DELETE FROM rate_limit_blocks WHERE blocked_until < NOW();
      $cleanup$
    );
  END IF;
END
$$;
