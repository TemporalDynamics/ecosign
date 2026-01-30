-- ============================================
-- Migration: Switch to Orchestrator Only
-- Fecha: 2026-01-29
-- Descripción: Desactiva fase1-executor y usa solo orchestrator para escalar
-- ============================================

-- ============================================
-- PASO 1: Desactivar cron de wake-execution-engine (fase1-executor)
-- ============================================
DO $do$
DECLARE
  job_exists INTEGER;
BEGIN
  SELECT COUNT(*) INTO job_exists
  FROM cron.job
  WHERE jobname = 'wake-execution-engine';

  IF job_exists > 0 THEN
    BEGIN
      PERFORM cron.unschedule('wake-execution-engine');
      RAISE NOTICE '✅ Cron job wake-execution-engine DESACTIVADO exitosamente';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '⚠️ Error desactivando wake-execution-engine: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'ℹ️  Cron job wake-execution-engine no existe (ya fue desactivado)';
  END IF;
END $do$;

-- ============================================
-- PASO 2: Verificar que orchestrator-poll-jobs existe y está activo
-- ============================================
DO $do$
DECLARE
  job_exists INTEGER;
BEGIN
  SELECT COUNT(*) INTO job_exists
  FROM cron.job
  WHERE jobname = 'orchestrator-poll-jobs';

  IF job_exists > 0 THEN
    RAISE NOTICE '✅ Cron job orchestrator-poll-jobs está ACTIVO';
  ELSE
    RAISE WARNING '⚠️ IMPORTANTE: Cron job orchestrator-poll-jobs NO existe';
    RAISE WARNING '   Ejecuta la migración 20260127000000_orchestrator_cron_job.sql';
  END IF;
END $do$;

-- ============================================
-- PASO 3: Estado final del sistema
-- ============================================
DO $do$
DECLARE
  orchestrator_active BOOLEAN;
  fase1_active BOOLEAN;
BEGIN
  -- Verificar orchestrator
  SELECT EXISTS(
    SELECT 1 FROM cron.job WHERE jobname = 'orchestrator-poll-jobs' AND active = true
  ) INTO orchestrator_active;

  -- Verificar fase1
  SELECT EXISTS(
    SELECT 1 FROM cron.job WHERE jobname = 'wake-execution-engine' AND active = true
  ) INTO fase1_active;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🎯 ESTADO FINAL DEL SISTEMA DE EJECUCIÓN';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  IF orchestrator_active AND NOT fase1_active THEN
    RAISE NOTICE '✅ CONFIGURACIÓN CORRECTA PARA ESCALAR';
    RAISE NOTICE '   • orchestrator-poll-jobs: ACTIVO ✓';
    RAISE NOTICE '   • wake-execution-engine: INACTIVO ✓';
    RAISE NOTICE '   • Usa claim_orchestrator_jobs con locking correcto';
    RAISE NOTICE '   • Escalabilidad horizontal habilitada';
  ELSIF orchestrator_active AND fase1_active THEN
    RAISE WARNING '⚠️  AMBOS CRONS ACTIVOS - POSIBLE CONFLICTO';
    RAISE WARNING '   • orchestrator-poll-jobs: ACTIVO';
    RAISE WARNING '   • wake-execution-engine: ACTIVO';
    RAISE WARNING '   Ejecuta: SELECT cron.unschedule(''wake-execution-engine'');';
  ELSIF NOT orchestrator_active AND fase1_active THEN
    RAISE WARNING '⚠️  USANDO FASE1-EXECUTOR (NO ESCALABLE)';
    RAISE WARNING '   • orchestrator-poll-jobs: INACTIVO';
    RAISE WARNING '   • wake-execution-engine: ACTIVO';
    RAISE WARNING '   Ejecuta migración: 20260127000000_orchestrator_cron_job.sql';
  ELSE
    RAISE WARNING '❌ NINGÚN CRON ACTIVO - SISTEMA NO PROCESARÁ JOBS';
    RAISE WARNING '   Ejecuta migración: 20260127000000_orchestrator_cron_job.sql';
  END IF;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $do$;

-- ============================================
-- VERIFICACIÓN: Mostrar todos los crons de ejecución
-- ============================================
DO $do$
DECLARE
  cron_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 CRONS DE EJECUCIÓN ACTIVOS:';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  FOR cron_record IN
    SELECT jobname, schedule, active
    FROM cron.job
    WHERE jobname IN ('orchestrator-poll-jobs', 'wake-execution-engine')
    ORDER BY jobname
  LOOP
    RAISE NOTICE '• %: % (schedule: %)',
      cron_record.jobname,
      CASE WHEN cron_record.active THEN 'ACTIVO ✓' ELSE 'INACTIVO ✗' END,
      cron_record.schedule;
  END LOOP;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $do$;
