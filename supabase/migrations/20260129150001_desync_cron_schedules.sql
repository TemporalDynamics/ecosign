-- ============================================
-- Migration: Desesincronizar Schedules de Crons
-- Fecha: 2026-01-29
-- Descripción: Evitar que ambos ejecutores corran simultáneamente
-- ============================================

-- ============================================
-- REPROGRAMAR wake-execution-engine
-- Para que corra en :15 y :45 de cada minuto
-- ============================================
DO $do$
DECLARE
  job_exists INTEGER;
BEGIN
  SELECT COUNT(*) INTO job_exists
  FROM cron.job
  WHERE jobname = 'wake-execution-engine';

  IF job_exists > 0 THEN
    -- Desprogramar el cron existente
    PERFORM cron.unschedule('wake-execution-engine');
    RAISE NOTICE '🔄 Cron wake-execution-engine desprogramado';
  END IF;

  -- Reprogramar con nuevo schedule (15 segundos de offset)
  PERFORM cron.schedule(
    'wake-execution-engine',
    '15,45 * * * * *',  -- Corre en :15 y :45 de cada minuto
    'SELECT wake_execution_engine();'
  );

  RAISE NOTICE '✅ Cron wake-execution-engine reprogramado: 15,45 * * * * *';
  RAISE NOTICE '   Ejecuta en: :15 y :45 de cada minuto';
END $do$;

-- ============================================
-- VERIFICAR orchestrator-poll-jobs
-- Debe correr en :00 y :30 de cada minuto
-- ============================================
DO $do$
DECLARE
  job_exists INTEGER;
  current_schedule TEXT;
BEGIN
  SELECT schedule INTO current_schedule
  FROM cron.job
  WHERE jobname = 'orchestrator-poll-jobs';

  IF current_schedule IS NULL THEN
    RAISE WARNING '⚠️  Cron orchestrator-poll-jobs no existe';
    RAISE WARNING '   Ejecuta la migración 20260127000000_orchestrator_cron_job.sql';
  ELSIF current_schedule = '*/30 * * * * *' THEN
    RAISE NOTICE '✅ Cron orchestrator-poll-jobs configurado correctamente';
    RAISE NOTICE '   Schedule: */30 * * * * * (ejecuta en :00 y :30)';
  ELSE
    RAISE WARNING '⚠️  Cron orchestrator-poll-jobs tiene schedule inesperado: %', current_schedule;
  END IF;
END $do$;

-- ============================================
-- ESTADO FINAL
-- ============================================
DO $do$
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🎯 SCHEDULES DE CRONS DESESINCRONIZADOS';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '⏰ CRONOGRAMA:';
  RAISE NOTICE '';
  RAISE NOTICE '   :00 → orchestrator-poll-jobs ejecuta';
  RAISE NOTICE '   :15 → wake-execution-engine ejecuta';
  RAISE NOTICE '   :30 → orchestrator-poll-jobs ejecuta';
  RAISE NOTICE '   :45 → wake-execution-engine ejecuta';
  RAISE NOTICE '';
  RAISE NOTICE '✅ VENTAJAS:';
  RAISE NOTICE '   • Nunca corren simultáneamente';
  RAISE NOTICE '   • Reduce picos de memoria';
  RAISE NOTICE '   • Reduce contención de DB';
  RAISE NOTICE '   • Mejor distribución de carga';
  RAISE NOTICE '';
  RAISE NOTICE '📊 IMPACTO:';
  RAISE NOTICE '   • Antes: Ambos cada 30s = posible overlap';
  RAISE NOTICE '   • Ahora: Alternados cada 15s = sin overlap';
  RAISE NOTICE '   • Throughput: Mismo (cada 30s por ejecutor)';
  RAISE NOTICE '   • Latencia promedio: Mejor (revisión cada 15s)';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $do$;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
DO $do$
DECLARE
  cron_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 SCHEDULES FINALES:';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  FOR cron_record IN
    SELECT jobname, schedule, active
    FROM cron.job
    WHERE jobname IN ('orchestrator-poll-jobs', 'wake-execution-engine')
    ORDER BY jobname
  LOOP
    RAISE NOTICE '• %', cron_record.jobname;
    RAISE NOTICE '  Schedule: %', cron_record.schedule;
    RAISE NOTICE '  Activo: %', CASE WHEN cron_record.active THEN 'Sí ✓' ELSE 'No ✗' END;
  END LOOP;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $do$;
