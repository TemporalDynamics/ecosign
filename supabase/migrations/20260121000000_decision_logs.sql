-- Migration: Decision logs table for executor decisions
-- Purpose: Track all executor decisions for auditability and debugging

-- Create decision logs table
CREATE TABLE IF NOT EXISTS public.executor_decision_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_entity_id uuid REFERENCES document_entities(id) ON DELETE CASCADE,
  policy_version TEXT NOT NULL DEFAULT 'v1',
  events_hash TEXT, -- Hash of events[] at decision time
  decision JSONB NOT NULL, -- Array of jobs decided
  reason TEXT, -- Human-readable reason
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying by document
CREATE INDEX IF NOT EXISTS idx_executor_decision_logs_document
  ON public.executor_decision_logs (document_entity_id, created_at DESC);

-- Index for querying by policy version
CREATE INDEX IF NOT EXISTS idx_executor_decision_logs_policy
  ON public.executor_decision_logs (policy_version, created_at DESC);

-- Function to hash events array for consistency check
CREATE OR REPLACE FUNCTION hash_events_array(events_arr JSONB)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  events_json TEXT;
  hash_bytes BYTEA;
BEGIN
  -- Normalize the events array to ensure consistent hashing
  events_json := events_arr::TEXT;
  hash_bytes := digest(events_json, 'sha256');
  RETURN encode(hash_bytes, 'hex');
END;
$$;

-- Comment for documentation
COMMENT ON TABLE executor_decision_logs IS 'Logs all executor decisions for auditability. Each row represents a decision made by the executor based on current events state.';
COMMENT ON COLUMN executor_decision_logs.policy_version IS 'Version of the decision policy used for this decision.';
COMMENT ON COLUMN executor_decision_logs.events_hash IS 'SHA-256 hash of events[] at decision time for consistency verification.';
COMMENT ON COLUMN executor_decision_logs.decision IS 'Array of jobs decided by the executor (e.g., ["build_artifact", "submit_anchor_polygon"])';
COMMENT ON COLUMN executor_decision_logs.reason IS 'Human-readable explanation of why this decision was made.';