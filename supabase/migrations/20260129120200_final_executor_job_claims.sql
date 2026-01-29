-- ============================================
-- Migration: Final Executor Job Claims (Consolidated)
-- Fecha: 2026-01-29
-- Descripción: Funciones finales de reclamación de jobs
-- ============================================

-- ============================================
-- FUNCIÓN: claim_initial_decision_jobs - Executor (fase1-executor)
-- ============================================
CREATE OR REPLACE FUNCTION public.claim_initial_decision_jobs(
  p_limit integer DEFAULT 5,
  p_worker_id text DEFAULT NULL
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
        'document.protected',
        'protect_document_v2',
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
      updated_at = now()
  FROM candidate
  WHERE j.id = candidate.id
  RETURNING j.*;
END;
$$;

-- ============================================
-- FUNCIÓN: claim_execution_jobs - Orchestrator (reservado para otros jobs)
-- ============================================
CREATE OR REPLACE FUNCTION public.claim_execution_jobs(
  p_limit integer DEFAULT 5,
  p_worker_id text DEFAULT NULL
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
        'submit_anchor_ethereum',
        'submit_anchor_solana'
      )
    ORDER BY run_at ASC, created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.executor_jobs j
  SET status = 'running',
      locked_at = now(),
      locked_by = p_worker_id,
      updated_at = now()
  FROM candidate
  WHERE j.id = candidate.id
  RETURNING j.*;
END;
$$;

-- ============================================
-- FUNCIÓN: claim_executor_jobs - General (compatibilidad)
-- ============================================
CREATE OR REPLACE FUNCTION public.claim_executor_jobs(
  p_limit integer DEFAULT 5,
  p_worker_id text DEFAULT NULL
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
    ORDER BY run_at ASC, created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.executor_jobs j
  SET status = 'running',
      locked_at = now(),
      locked_by = p_worker_id,
      updated_at = now()
  FROM candidate
  WHERE j.id = candidate.id
  RETURNING j.*;
END;
$$;

-- ============================================
-- VERIFICACIÓN
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Funciones de reclamación de jobs (final) aplicadas';
  RAISE NOTICE '   - claim_initial_decision_jobs(): Executor';
  RAISE NOTICE '   - claim_execution_jobs(): Orchestrator';
  RAISE NOTICE '   - claim_executor_jobs(): General';
END $$;
