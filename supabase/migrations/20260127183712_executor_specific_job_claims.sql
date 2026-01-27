-- ============================================
-- Migration: Executor-specific job claiming function
-- Fecha: 2026-01-27
-- Descripción: Crea función específica para que el executor reclame solo jobs de decisión inicial
-- ============================================

-- ============================================
-- FUNCIÓN: claim_initial_decision_jobs - Solo para executor
-- ============================================
-- Esta función reclama solo jobs de tipo inicial que el executor puede procesar
-- NO reclama jobs que deben ser procesados por el orchestrator
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
      -- Solo jobs que el executor puede procesar
      AND type IN (
        'document.protected',           -- Job inicial de protección
        'protect_document_v2'          -- Otro job inicial de protección
        -- Agregar aquí otros tipos que el executor puede procesar
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
-- FUNCIÓN: claim_execution_jobs - Solo para orchestrator
-- ============================================
-- Esta función reclama solo jobs de tipo ejecución que el orchestrator debe procesar
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
      -- Solo jobs que el orchestrator debe procesar
      AND type IN (
        'run_tsa',                    -- Ejecutar TSA
        'submit_anchor_polygon',      -- Enviar anclaje a Polygon
        'submit_anchor_bitcoin',      -- Enviar anclaje a Bitcoin
        'build_artifact',             -- Construir artifact
        -- Agregar aquí otros tipos que el orchestrator debe procesar
        'submit_anchor_ethereum',     -- Otros anclajes posibles
        'submit_anchor_solana'        -- Otros anclajes posibles
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
-- ACTUALIZAR FUNCIÓN claim_executor_jobs PARA SER GENERAL (mantener para compatibilidad)
-- ============================================
-- Renombrar la función original para que sea más genérica
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
  RAISE NOTICE '✅ Funciones de reclamación de jobs actualizadas';
  RAISE NOTICE '   - claim_initial_decision_jobs(): Solo para executor';
  RAISE NOTICE '   - claim_execution_jobs(): Solo para orchestrator';
  RAISE NOTICE '   - claim_executor_jobs(): General (para compatibilidad)';
END $$;