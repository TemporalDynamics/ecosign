-- System workers table for heartbeat/observability
-- Tracks when each worker last ran

CREATE TABLE IF NOT EXISTS system_workers (
  name TEXT PRIMARY KEY,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'alive' CHECK (status IN ('alive', 'stalled', 'dead')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_workers_status ON system_workers(status);

-- Function to update worker heartbeat
CREATE OR REPLACE FUNCTION public.worker_heartbeat(worker_name TEXT, worker_status TEXT DEFAULT 'alive')
RETURNS VOID AS $$
BEGIN
  INSERT INTO system_workers (name, last_seen_at, status)
    VALUES (worker_name, now(), worker_status)
  ON CONFLICT (name) DO UPDATE SET
    last_seen_at = now(),
    status = EXCLUDED.status,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant service_role execute to
GRANT EXECUTE ON FUNCTION public.worker_heartbeat(TEXT, TEXT) TO service_role;

COMMENT ON TABLE system_workers IS 'Heartbeat table for background workers. Used by /anchor-health to verify workers are running.';
COMMENT ON FUNCTION public.worker_heartbeat IS 'Update worker heartbeat. Call at start of each worker run.';
