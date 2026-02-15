-- Migration: Forward-only anchor pipeline hardening
-- Date: 2026-02-15
-- Purpose:
-- 1) Keep orchestrator focused on execution jobs only.
-- 2) Disable legacy DB trigger path for blockchain anchoring from user_documents.
-- 3) Enable canonical authority flags for D1/D3/D4.

-- ---------------------------------------------------------------------------
-- 1) Fix claim_orchestrator_jobs scope (execution only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_orchestrator_jobs(
  p_limit integer DEFAULT 10,
  p_worker_id text DEFAULT 'orchestrator'
)
RETURNS TABLE(
  id uuid,
  type text,
  entity_id uuid,
  payload jsonb,
  attempts integer,
  max_attempts integer,
  created_at timestamptz,
  correlation_id uuid,
  trace_id text
)
LANGUAGE plpgsql
AS $$
DECLARE
  job_ids uuid[];
BEGIN
  SELECT array_agg(j.job_id) INTO job_ids
  FROM (
    SELECT executor_jobs.id as job_id
    FROM executor_jobs
    WHERE executor_jobs.status IN ('queued', 'retry_scheduled')
      AND executor_jobs.type IN (
        'run_tsa',
        'submit_anchor_polygon',
        'submit_anchor_bitcoin',
        'build_artifact',
        'generate_signature_evidence'
      )
      AND executor_jobs.run_at <= now()
      AND (executor_jobs.locked_at IS NULL OR executor_jobs.locked_at < now() - interval '5 minutes')
    ORDER BY executor_jobs.run_at ASC, executor_jobs.created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  ) j;

  IF job_ids IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE executor_jobs
  SET
    status = 'running',
    attempts = executor_jobs.attempts + 1,
    locked_at = now(),
    locked_by = p_worker_id,
    heartbeat_at = now(),
    updated_at = now()
  WHERE executor_jobs.id = ANY(job_ids)
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

COMMENT ON FUNCTION public.claim_orchestrator_jobs(integer, text) IS
  'Reclama solo jobs de ejecucion (run_tsa, anchors, build_artifact, evidence). Evita capturar jobs de decision.';

-- ---------------------------------------------------------------------------
-- 2) Disable legacy trigger entrypoint (user_documents -> anchor-* direct)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_user_documents_blockchain_anchoring'
      AND tgrelid = 'public.user_documents'::regclass
  ) THEN
    ALTER TABLE public.user_documents DISABLE TRIGGER on_user_documents_blockchain_anchoring;
    RAISE NOTICE 'Disabled trigger on_user_documents_blockchain_anchoring (forward-only mode)';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Skipping trigger disable: public.user_documents does not exist';
END $$;

-- ---------------------------------------------------------------------------
-- 3) Canonical authority flags for forward-only path
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.feature_flags') IS NOT NULL THEN
    INSERT INTO public.feature_flags (flag_name, enabled)
    VALUES
      ('D1_RUN_TSA_ENABLED', true),
      ('D3_BUILD_ARTIFACT_ENABLED', true),
      ('D4_ANCHORS_ENABLED', true)
    ON CONFLICT (flag_name) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      updated_at = now();
  ELSE
    RAISE NOTICE 'Skipping feature flag update: public.feature_flags does not exist';
  END IF;
END $$;
