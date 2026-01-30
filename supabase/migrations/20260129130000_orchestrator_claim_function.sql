-- ============================================
-- Migration: Orchestrator Claim Function
-- Fecha: 2026-01-29
-- Descripción: Función de claim con locking correcto para orchestrator
-- ============================================

-- Crear función que reclama jobs de forma atómica para el orchestrator
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
        'build_artifact',
        'document.protected',      -- Legacy support
        'protect_document_v2'      -- V2 support
      )
    ORDER BY run_at ASC, created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED        -- LOCKING CORRECTO
  )
  UPDATE public.executor_jobs j
  SET status = 'processing',      -- Estado consistente con orchestrator
      locked_at = now(),
      locked_by = p_worker_id,
      attempts = attempts + 1,
      updated_at = now()
  FROM candidate
  WHERE j.id = candidate.id
  RETURNING j.*;
END;
$$;

-- Dar permisos
GRANT EXECUTE ON FUNCTION public.claim_orchestrator_jobs(integer, text) TO postgres;
GRANT EXECUTE ON FUNCTION public.claim_orchestrator_jobs(integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.claim_orchestrator_jobs(integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_orchestrator_jobs(integer, text) TO service_role;

-- Comentario
COMMENT ON FUNCTION public.claim_orchestrator_jobs(integer, text) IS
  'Reclama jobs pendientes de forma atómica usando FOR UPDATE SKIP LOCKED para evitar conflictos de concurrencia';

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Función claim_orchestrator_jobs creada exitosamente';
  RAISE NOTICE '   Soporta locking atómico con FOR UPDATE SKIP LOCKED';
  RAISE NOTICE '   Procesa tipos: run_tsa, submit_anchor_polygon, submit_anchor_bitcoin, build_artifact';
  RAISE NOTICE '   Límite por defecto: 10 jobs';
END $$;
