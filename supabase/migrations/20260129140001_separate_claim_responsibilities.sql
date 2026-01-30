-- ============================================
-- Migration: Separar Responsabilidades de Claim
-- Fecha: 2026-01-29
-- Descripción: Cada claim solo reclama sus tipos específicos
-- ============================================

-- ============================================
-- ACTUALIZAR claim_initial_decision_jobs
-- Solo reclama jobs de DECISIÓN
-- ============================================
CREATE OR REPLACE FUNCTION public.claim_initial_decision_jobs(
  p_limit integer DEFAULT 5,
  p_worker_id text DEFAULT 'fase1-executor'
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
        'document.protected',      -- ✅ Solo decisión
        'protect_document_v2'      -- ✅ Solo decisión
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

COMMENT ON FUNCTION public.claim_initial_decision_jobs(integer, text) IS
  'Reclama jobs de DECISIÓN (document.protected, protect_document_v2) - NO ejecuta trabajo pesado';

-- ============================================
-- ACTUALIZAR claim_orchestrator_jobs
-- Solo reclama jobs de EJECUCIÓN
-- ============================================
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
        'run_tsa',                 -- ✅ Solo ejecución
        'submit_anchor_polygon',   -- ✅ Solo ejecución
        'submit_anchor_bitcoin',   -- ✅ Solo ejecución
        'build_artifact'           -- ✅ Solo ejecución
      )
    ORDER BY run_at ASC, created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.executor_jobs j
  SET status = 'processing',      -- orchestrator usa 'processing'
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
  'Reclama jobs de EJECUCIÓN (run_tsa, anchors, artifact) - Ejecuta trabajo pesado';

-- ============================================
-- MENSAJE DE CONFIRMACIÓN
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Funciones de claim actualizadas con división de responsabilidades:';
  RAISE NOTICE '';
  RAISE NOTICE '📋 claim_initial_decision_jobs:';
  RAISE NOTICE '   → document.protected';
  RAISE NOTICE '   → protect_document_v2';
  RAISE NOTICE '';
  RAISE NOTICE '🔨 claim_orchestrator_jobs:';
  RAISE NOTICE '   → run_tsa';
  RAISE NOTICE '   → submit_anchor_polygon';
  RAISE NOTICE '   → submit_anchor_bitcoin';
  RAISE NOTICE '   → build_artifact';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Sin conflictos: cada ejecutor procesa tipos diferentes';
END $$;
