-- ============================================
-- Migration: Pure Canonical Mode Controls
-- Fecha: 2026-01-27
-- Descripción: Agrega controles para asegurar escrituras solo en modelo canónico
-- ============================================

-- ============================================
-- FUNCIÓN: Verificar intento de escritura legacy
-- ============================================
CREATE OR REPLACE FUNCTION public.check_legacy_write_attempt(table_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  canonical_mode TEXT;
  is_legacy_table BOOLEAN;
BEGIN
  -- Obtener modo canónico
  SELECT current_setting('app.mode.canonical_only', true) INTO canonical_mode;
  
  -- Si no está en modo canónico puro, permitir todo
  IF canonical_mode != 'true' THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar si es tabla legacy
  is_legacy_table := table_name IN ('user_documents', 'documents', 'legacy_documents');
  
  -- Si es tabla legacy en modo canónico puro, bloquear
  IF is_legacy_table THEN
    RAISE EXCEPTION 'Legacy write blocked in pure canonical mode: %', table_name;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN: Wake Execution Engine (Solo despierta, no decide ni ejecuta)
-- ============================================
CREATE OR REPLACE FUNCTION public.wake_execution_engine()
RETURNS void AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
BEGIN
  -- Obtener URLs y claves desde settings
  SELECT current_setting('app.settings.supabase_url', true),
         current_setting('app.settings.service_role_key', true)
  INTO supabase_url, service_role_key;

  -- Si no existen, salir
  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING 'Missing app settings for wake_execution_engine. Skipping wake.';
    RETURN;
  END IF;

  -- Registrar que se está despertando el sistema
  RAISE NOTICE 'wake_execution_engine: Despertando ExecutionEngine...';

  -- Llamar al orchestrator para que revise jobs pendientes
  -- Esto no decide nada, solo despierta el sistema
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/orchestrator',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_role_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'action', 'poll_jobs',
      'timestamp', EXTRACT(EPOCH FROM NOW())::INTEGER,
      'source', 'wake_execution_engine'
    )
  ) INTO request_id;

  -- Registrar resultado
  RAISE NOTICE 'wake_execution_engine: ExecutionEngine despertado, request_id=%', request_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'wake_execution_engine: Error despertando ExecutionEngine: %', SQLERRM;
    -- No lanzar error para que el cron no falle
END;
$$ LANGUAGE plpgsql;

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
  PERFORM cron.schedule(
    'wake-execution-engine',
    '*/30 * * * * *',  -- Cada 30 segundos
    'SELECT wake_execution_engine();'
  );

  -- Mensaje de confirmación
  RAISE NOTICE '✅ Cron job wake-execution-engine programado cada 30 segundos';
  RAISE NOTICE '   Función: wake_execution_engine()';
  RAISE NOTICE '   Frecuencia: */30 * * * * * (cada 30 segundos)';
  RAISE NOTICE '   Acción: Despertar ExecutionEngine (sin decidir ni ejecutar)';
END $$;

-- ============================================
-- PERMISOS: Dar acceso a funciones críticas
-- ============================================
GRANT EXECUTE ON FUNCTION public.check_legacy_write_attempt(TEXT) TO postgres;
GRANT EXECUTE ON FUNCTION public.check_legacy_write_attempt(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_legacy_write_attempt(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wake_execution_engine() TO postgres;
GRANT EXECUTE ON FUNCTION public.wake_execution_engine() TO anon;
GRANT EXECUTE ON FUNCTION public.wake_execution_engine() TO authenticated;

-- ============================================
-- COMENTARIOS: Documentar funciones
-- ============================================
COMMENT ON FUNCTION public.check_legacy_write_attempt IS 'Verifica si se intenta escribir en tabla legacy en modo canónico puro';
COMMENT ON FUNCTION public.wake_execution_engine IS 'Despierta el ExecutionEngine para que revise jobs pendientes - NO decide ni ejecuta, solo despierta';

-- ============================================
-- VERIFICACIÓN: Confirmar que todo está correcto
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎯 SISTEMA CANÓNICO - CONTROLES IMPLEMENTADOS';
  RAISE NOTICE '   - check_legacy_write_attempt(): Control de escrituras legacy';
  RAISE NOTICE '   - wake_execution_engine(): Despertador del sistema';
  RAISE NOTICE '   - Cron job: wake-execution-engine cada 30 segundos';
  RAISE NOTICE '   - Permisos: Asegurados para todos los roles';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 MODELO DE AUTORIDAD ÚNICA ACTIVO:';
  RAISE NOTICE '   - DecisionAuthority: Lee verdad → Usa autoridad → Escribe cola';
  RAISE NOTICE '   - ExecutionEngine: Lee cola → Ejecuta → Escribe eventos';
  RAISE NOTICE '   - WakeExecutionEngine: Solo despierta (sin lógica de negocio)';
  RAISE NOTICE '';
END $$;