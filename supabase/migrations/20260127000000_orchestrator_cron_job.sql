-- ============================================
-- Migration: Orchestrator Cron Job
-- Fecha: 2026-01-27
-- Descripción: Programa el orchestrator para que revise jobs pendientes cada 30 segundos
-- ============================================

-- Eliminar cron job si ya existe
SELECT cron.unschedule('orchestrator-poll-jobs')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'orchestrator-poll-jobs');

-- Programar el nuevo cron job para llamar a la función de procesamiento
SELECT cron.schedule(
  'orchestrator-poll-jobs',
  '*/30 * * * * *',  -- Cada 30 segundos
  'SELECT process_orchestrator_jobs();'
);

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Orchestrator cron job programado para revisar jobs cada 30 segundos';
  RAISE NOTICE '   Función: orchestrator-poll-jobs';
  RAISE NOTICE '   Frecuencia: */30 * * * * * (cada 30 segundos)';
  RAISE NOTICE '   Ejecuta: process_orchestrator_jobs()';
END $$;