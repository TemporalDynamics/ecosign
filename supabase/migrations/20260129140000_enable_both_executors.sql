-- ============================================
-- Migration: Habilitar Ambos Ejecutores (División de Responsabilidades)
-- Fecha: 2026-01-29
-- Descripción: fase1-executor para decisiones, orchestrator para ejecución
-- ============================================

-- ============================================
-- REACTIVAR wake-execution-engine (fase1-executor)
-- ============================================
DO $do$
DECLARE
  job_exists INTEGER;
BEGIN
  SELECT COUNT(*) INTO job_exists
  FROM cron.job
  WHERE jobname = 'wake-execution-engine';

  IF job_exists > 0 THEN
    RAISE NOTICE 'ℹ️  Cron wake-execution-engine ya existe, no se crea nuevamente';
  ELSE
    BEGIN
      PERFORM cron.schedule(
        'wake-execution-engine',
        '*/30 * * * * *',
        'SELECT wake_execution_engine();'
      );
      RAISE NOTICE '✅ Cron job wake-execution-engine REACTIVADO exitosamente';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '⚠️ Error reactivando wake-execution-engine: %', SQLERRM;
    END;
  END IF;
END $do$;

-- ============================================
-- VERIFICAR que orchestrator-poll-jobs sigue activo
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
-- DIVISIÓN DE RESPONSABILIDADES
-- ============================================
DO $do$
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🎯 ARQUITECTURA DE DOBLE EJECUTOR';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📋 FASE1-EXECUTOR (wake-execution-engine):';
  RAISE NOTICE '   → Procesa jobs de DECISIÓN';
  RAISE NOTICE '   → Tipos: document.protected, protect_document_v2';
  RAISE NOTICE '   → Acción: Lee eventos, decide, encola jobs de ejecución';
  RAISE NOTICE '   → Usa: claim_initial_decision_jobs()';
  RAISE NOTICE '';
  RAISE NOTICE '🔨 ORCHESTRATOR (orchestrator-poll-jobs):';
  RAISE NOTICE '   → Procesa jobs de EJECUCIÓN';
  RAISE NOTICE '   → Tipos: run_tsa, submit_anchor_polygon, submit_anchor_bitcoin, build_artifact';
  RAISE NOTICE '   → Acción: Ejecuta trabajo pesado (llamadas a TSA, blockchain, etc.)';
  RAISE NOTICE '   → Usa: claim_orchestrator_jobs()';
  RAISE NOTICE '';
  RAISE NOTICE '✅ VENTAJAS:';
  RAISE NOTICE '   • Separación de responsabilidades (decisión vs ejecución)';
  RAISE NOTICE '   • Escalabilidad: orchestrator escala automáticamente';
  RAISE NOTICE '   • No hay conflictos: cada uno procesa tipos diferentes';
  RAISE NOTICE '   • Locking correcto en ambos con FOR UPDATE SKIP LOCKED';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $do$;

-- ============================================
-- ESTADO FINAL
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

  IF orchestrator_active AND fase1_active THEN
    RAISE NOTICE '✅ CONFIGURACIÓN ÓPTIMA: AMBOS EJECUTORES ACTIVOS';
    RAISE NOTICE '   • orchestrator-poll-jobs: ACTIVO ✓';
    RAISE NOTICE '   • wake-execution-engine: ACTIVO ✓';
  ELSIF orchestrator_active AND NOT fase1_active THEN
    RAISE WARNING '⚠️  SOLO ORCHESTRATOR ACTIVO';
    RAISE WARNING '   Jobs de decisión NO se procesarán';
  ELSIF NOT orchestrator_active AND fase1_active THEN
    RAISE WARNING '⚠️  SOLO FASE1-EXECUTOR ACTIVO';
    RAISE WARNING '   Jobs de ejecución NO se procesarán (no escalable)';
  ELSE
    RAISE WARNING '❌ NINGÚN CRON ACTIVO - SISTEMA NO PROCESARÁ JOBS';
  END IF;
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
