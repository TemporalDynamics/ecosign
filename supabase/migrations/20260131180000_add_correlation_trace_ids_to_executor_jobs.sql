-- Add correlation_id and trace_id to executor_jobs
-- Migration: 20260131180000
-- Purpose: Enable complete traceability of documents from request to final evidence

ALTER TABLE public.executor_jobs
  ADD COLUMN correlation_id uuid,
  ADD COLUMN trace_id text;

-- Add index for fast correlation_id queries (critical for incident response)
CREATE INDEX executor_jobs_correlation_id_idx
  ON public.executor_jobs(correlation_id)
  WHERE correlation_id IS NOT NULL;

-- Add index for trace_id (useful for debugging specific runs)
CREATE INDEX executor_jobs_trace_id_idx
  ON public.executor_jobs(trace_id)
  WHERE trace_id IS NOT NULL;

-- Update claim_orchestrator_jobs to return new fields
-- Must DROP first because we're changing the return type
DROP FUNCTION IF EXISTS public.claim_orchestrator_jobs(integer, text);

CREATE FUNCTION public.claim_orchestrator_jobs(
  p_limit integer,
  p_worker_id text
)
RETURNS TABLE(
  id uuid,
  type text,
  entity_id uuid,
  payload jsonb,
  attempts integer,
  max_attempts integer,
  created_at timestamptz,
  correlation_id uuid,  -- NEW
  trace_id text         -- NEW
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE executor_jobs
  SET
    status = 'running',
    attempts = attempts + 1,
    locked_at = now(),
    locked_by = p_worker_id,
    heartbeat_at = now(),
    updated_at = now()
  WHERE executor_jobs.id IN (
    SELECT j.id
    FROM executor_jobs j
    WHERE j.status IN ('queued', 'retry_scheduled')
      AND j.run_at <= now()
      AND j.locked_at IS NULL
    ORDER BY j.run_at ASC, j.created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING
    executor_jobs.id,
    executor_jobs.type,
    executor_jobs.entity_id,
    executor_jobs.payload,
    executor_jobs.attempts,
    executor_jobs.max_attempts,
    executor_jobs.created_at,
    executor_jobs.correlation_id,
    executor_jobs.trace_id;
END;
$$;

-- Similarly update claim_initial_decision_jobs (used by fase1-executor)
-- Must DROP first because we're changing the return type
DROP FUNCTION IF EXISTS public.claim_initial_decision_jobs(integer, text);

CREATE FUNCTION public.claim_initial_decision_jobs(
  p_limit integer,
  p_worker_id text
)
RETURNS TABLE(
  id uuid,
  type text,
  entity_id uuid,
  payload jsonb,
  attempts integer,
  max_attempts integer,
  created_at timestamptz,
  correlation_id uuid,  -- NEW
  trace_id text         -- NEW
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE executor_jobs
  SET
    status = 'running',
    attempts = attempts + 1,
    locked_at = now(),
    locked_by = p_worker_id,
    heartbeat_at = now(),
    updated_at = now()
  WHERE executor_jobs.id IN (
    SELECT j.id
    FROM executor_jobs j
    WHERE j.status IN ('queued', 'retry_scheduled')
      AND j.type IN ('protect_document_v2', 'document.protected')
      AND j.run_at <= now()
      AND j.locked_at IS NULL
    ORDER BY j.run_at ASC, j.created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING
    executor_jobs.id,
    executor_jobs.type,
    executor_jobs.entity_id,
    executor_jobs.payload,
    executor_jobs.attempts,
    executor_jobs.max_attempts,
    executor_jobs.created_at,
    executor_jobs.correlation_id,
    executor_jobs.trace_id;
END;
$$;

COMMENT ON COLUMN executor_jobs.correlation_id IS 'Logical flow identifier (typically document_entity_id). Used to trace all jobs for a single document across retries and downstream jobs.';
COMMENT ON COLUMN executor_jobs.trace_id IS 'Execution trace identifier (unique per job run). Used to identify a specific attempt/execution of a job.';
