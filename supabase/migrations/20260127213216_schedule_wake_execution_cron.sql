-- LEGACY: replaced by 20260129120100_final_wake_execution_engine.sql
-- NOTE: kept for history; do not edit.

-- ============================================
-- Migration: Schedule Wake Execution Engine Cron
-- Fecha: 2026-01-27
-- Descripción: Programa el cron job para despertar el ExecutionEngine
-- ============================================

-- ============================================
-- PROGRAMAR CRON: Despertar ExecutionEngine cada 30 segundos
-- ============================================
DO $$
BEGIN
  -- Eliminar cron job si ya existe
  BEGIN
    PERFORM cron.unschedule('wake-execution-engine');
  EXCEPTION
    WHEN OTHERS THEN
      -- Si no existe, no hacer nada
      NULL;
  END;

  -- Programar el nuevo cron job
  -- Verificar que la función wake_execution_engine existe antes de programar
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'wake_execution_engine'
  ) THEN
    PERFORM cron.schedule(
      'wake-execution-engine',
      '*/30 * * * * *',  -- Cada 30 segundos
      'SELECT wake_execution_engine();'
    );

    RAISE NOTICE '✅ Cron job wake-execution-engine programado cada 30 segundos';
    RAISE NOTICE '   Función: wake_execution_engine()';
    RAISE NOTICE '   Frecuencia: */30 * * * * * (cada 30 segundos)';
    RAISE NOTICE '   Acción: Despertar ExecutionEngine (sin decidir ni ejecutar)';
  ELSE
    RAISE WARNING '⚠️ Función wake_execution_engine no encontrada, no se programa cron';
  END IF;
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
    RAISE NOTICE '✅ Cron job wake-execution-engine está activo';
  ELSE
    RAISE NOTICE 'ℹ️  Cron job wake-execution-engine no encontrado (puede ser normal si pg_cron no está instalado)';
  END IF;
END $$;