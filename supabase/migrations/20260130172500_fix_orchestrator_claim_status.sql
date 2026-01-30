-- Migration: Fix orchestrator job claim status
-- Date: 2026-01-30
--
-- Problem:
-- - public.executor_jobs has a CHECK constraint that does NOT allow status='processing'.
-- - claim_orchestrator_jobs() was setting status='processing', causing the claim UPDATE to fail.
-- - Result: execution jobs (run_tsa/build_artifact/anchors) remain queued forever.
--
-- Fix:
-- - Use status='running' (allowed by current CHECK) for orchestrator-claimed jobs.
-- - Keep locked_at/locked_by + attempts increment for observability.

CREATE OR REPLACE FUNCTION public.claim_orchestrator_jobs(
  p_limit integer DEFAULT 10,
  p_worker_id text DEFAULT 'orchestrator'
) RETURNS SETOF public.executor_jobs
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT id
    FROM public.executor_jobs
    WHERE status IN ('queued','retry_scheduled')
      AND run_at <= now()
      AND locked_at IS NULL
      AND type IN (
        'run_tsa',
        'submit_anchor_polygon',
        'submit_anchor_bitcoin',
        'build_artifact'
      )
    ORDER BY run_at ASC, created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.executor_jobs j
  SET status = 'running',
      locked_at = now(),
      locked_by = p_worker_id,
      attempts = attempts + 1,
      updated_at = now()
  FROM candidate
  WHERE j.id = candidate.id
  RETURNING j.*;
END;
$$;

COMMENT ON FUNCTION public.claim_orchestrator_jobs(integer, text) IS
  'Reclama jobs de EJECUCIÓN (run_tsa, anchors, artifact) - usa status=running por constraint de executor_jobs';
