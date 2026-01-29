-- ============================================
-- Migration: Final Wake Execution Engine (Consolidated)
-- Fecha: 2026-01-29
-- Descripción: Estado final de wake_execution_engine + cron schedule
-- ============================================

-- ============================================
-- FUNCIÓN: wake_execution_engine (despierta wake-authority)
-- ============================================
CREATE OR REPLACE FUNCTION public.wake_execution_engine()
RETURNS void AS $fn$
DECLARE
  supabase_url TEXT;
  request_id BIGINT;
BEGIN
  SELECT COALESCE(
           current_setting('app.settings.supabase_url', true),
           'https://uiyojopjbhooxrmamaiw.supabase.co'
         ),
         NULL
  INTO supabase_url, request_id;

  IF supabase_url IS NULL THEN
    RAISE WARNING 'Missing app.settings.supabase_url for wake_execution_engine. Skipping wake.';
    RETURN;
  END IF;

  RAISE NOTICE 'wake_execution_engine: Despertando wake-authority...';

  SELECT net.http_post(
    url := supabase_url || '/functions/v1/wake-authority',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('source', 'wake_execution_engine')
  ) INTO request_id;

  RAISE NOTICE 'wake_execution_engine: wake-authority despertado, request_id=%', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'wake_execution_engine: Error despertando ExecutionEngine: %', SQLERRM;
END;
$fn$ LANGUAGE plpgsql;

-- ============================================
-- PERMISOS + COMENTARIO
-- ============================================
GRANT EXECUTE ON FUNCTION public.wake_execution_engine() TO postgres;
GRANT EXECUTE ON FUNCTION public.wake_execution_engine() TO anon;
GRANT EXECUTE ON FUNCTION public.wake_execution_engine() TO authenticated;

COMMENT ON FUNCTION public.wake_execution_engine() IS
  'Despierta el ExecutionEngine para que revise jobs pendientes - NO decide ni ejecuta, solo despierta';

-- ============================================
-- CRON: Programar cada 30 segundos (idempotente)
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
      RAISE NOTICE '✅ Cron job existente wake-execution-engine desprogramado';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Error desprogramando cron job existente (posible que no exista): %', SQLERRM;
    END;
  END IF;

  BEGIN
    PERFORM cron.schedule(
      'wake-execution-engine',
      '*/30 * * * * *',
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
END $do$;

-- ============================================
-- VERIFICACIÓN
-- ============================================
DO $do$
DECLARE
  cron_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cron_count
  FROM cron.job
  WHERE jobname = 'wake-execution-engine';

  IF cron_count > 0 THEN
    RAISE NOTICE '🎯 CRON DE DESPERTADOR ACTIVO: wake-execution-engine';
  ELSE
    RAISE WARNING '⚠️  CRON DE DESPERTADOR NO ACTIVO (posible falta de pg_cron)';
  END IF;
END $do$;
