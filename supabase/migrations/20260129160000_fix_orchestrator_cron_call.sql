-- ============================================
-- Migration: Fix process_orchestrator_jobs (Hardcodear URL)
-- Fecha: 2026-01-29
-- Descripción: Arreglar función para que no dependa de app.settings
-- ============================================

-- ============================================
-- FIX: Hardcodear URL de Supabase y llamar sin auth
-- ============================================
CREATE OR REPLACE FUNCTION process_orchestrator_jobs()
RETURNS void AS $$
DECLARE
  supabase_url TEXT;
  request_id BIGINT;
BEGIN
  -- Hardcodear URL de producción
  supabase_url := 'https://uiyojopjbhooxrmamaiw.supabase.co';

  RAISE NOTICE '[process_orchestrator_jobs] Llamando a orchestrator...';

  -- Llamar al orchestrator vía HTTP
  -- La función de Edge no requiere autenticación interna cuando es llamada por cron
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/orchestrator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) INTO request_id;

  RAISE NOTICE '[process_orchestrator_jobs] Orchestrator llamado, request_id=%', request_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[process_orchestrator_jobs] Error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_orchestrator_jobs() IS
  'Llama al orchestrator via HTTP para procesar jobs pendientes';

-- ============================================
-- FIX: wake_execution_engine también
-- ============================================
CREATE OR REPLACE FUNCTION public.wake_execution_engine()
RETURNS void AS $$
DECLARE
  supabase_url TEXT;
  request_id BIGINT;
BEGIN
  -- Hardcodear URL de producción
  supabase_url := 'https://uiyojopjbhooxrmamaiw.supabase.co';

  RAISE NOTICE '[wake_execution_engine] Llamando a fase1-executor...';

  SELECT net.http_post(
    url := supabase_url || '/functions/v1/fase1-executor',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('source', 'wake_execution_engine')
  ) INTO request_id;

  RAISE NOTICE '[wake_execution_engine] fase1-executor llamado, request_id=%', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[wake_execution_engine] Error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.wake_execution_engine() IS
  'Despierta el fase1-executor para que revise jobs pendientes';

-- ============================================
-- VERIFICACIÓN
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ FIX APLICADO: Funciones de Wake con URL hardcodeado';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 ANTES:';
  RAISE NOTICE '   • Buscaba app.settings.supabase_url (NULL)';
  RAISE NOTICE '   • Salía sin hacer nada';
  RAISE NOTICE '   • No llamaba al orchestrator';
  RAISE NOTICE '';
  RAISE NOTICE '✅ AHORA:';
  RAISE NOTICE '   • URL hardcodeado: https://uiyojopjbhooxrmamaiw.supabase.co';
  RAISE NOTICE '   • Siempre llama al orchestrator';
  RAISE NOTICE '   • Genera logs con RAISE NOTICE';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- ============================================
-- TEST: Ejecutar manualmente para verificar
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Ejecutando test manual...';
  PERFORM process_orchestrator_jobs();
  PERFORM wake_execution_engine();
  RAISE NOTICE '✅ Test completado - verifica los logs arriba';
END $$;
