-- LEGACY: replaced by 20260129120100_final_wake_execution_engine.sql
-- NOTE: kept for history; do not edit.

-- ============================================
-- Migration: Schedule Wake Execution Engine Cron Job
-- Fecha: 2026-01-27
-- Descripción: Programa el cron job para despertar el ExecutionEngine cada 30 segundos
-- ============================================

-- ============================================
-- PROGRAMAR CRON: Despertar ExecutionEngine cada 30 segundos
-- ============================================
DO $$
DECLARE
  job_exists INTEGER;
BEGIN
  -- Verificar si el cron job ya existe
  SELECT COUNT(*) INTO job_exists
  FROM cron.job
  WHERE jobname = 'wake-execution-engine';

  -- Si ya existe, desprogramarlo
  IF job_exists > 0 THEN
    BEGIN
      PERFORM cron.unschedule('wake-execution-engine');
      RAISE NOTICE '✅ Cron job existente wake-execution-engine desprogramado';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Error desprogramando cron job existente (posible que no exista): %', SQLERRM;
    END;
  END IF;

  -- Programar el nuevo cron job para despertar el ExecutionEngine
  -- Este job solo despierta el sistema, no decide ni ejecuta nada
  BEGIN
    PERFORM cron.schedule(
      'wake-execution-engine',
      '*/30 * * * * *',  -- Cada 30 segundos
      'SELECT wake_execution_engine();'
    );

    RAISE NOTICE '✅ Cron job wake-execution-engine programado cada 30 segundos';
    RAISE NOTICE '   Función: wake_execution_engine()';
    RAISE NOTICE '   Frecuencia: */30 * * * * * (cada 30 segundos)';
    RAISE NOTICE '   Acción: Despertar ExecutionEngine (sin decidir ni ejecutar)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '⚠️ Error programando cron job wake-execution-engine: %', SQLERRM;
      RAISE WARNING '   Verifica que la extensión pg_cron esté instalada y activa';
  END;

END $$;

-- ============================================
-- VERIFICACIÓN: Confirmar que el cron está programado
-- ============================================
DO $$
DECLARE
  cron_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cron_count
  FROM cron.job
  WHERE jobname = 'wake-execution-engine';

  IF cron_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎯 CRON DE DESPERTADOR ACTIVO';
    RAISE NOTICE '   - Cron job: wake-execution-engine';
    RAISE NOTICE '   - Frecuencia: Cada 30 segundos';
    RAISE NOTICE '   - Función: wake_execution_engine()';
    RAISE NOTICE '   - Propósito: Despertar ExecutionEngine (sin lógica de negocio)';
    RAISE NOTICE '';
  ELSE
    RAISE WARNING '';
    RAISE WARNING '⚠️  CRON DE DESPERTADOR NO ACTIVO';
    RAISE WARNING '   - El cron job wake-execution-engine no está programado';
    RAISE WARNING '   - Esto puede ser normal si pg_cron no está instalado';
    RAISE WARNING '   - El sistema puede usar otro mecanismo de despertador';
    RAISE WARNING '';
  END IF;
END $$;