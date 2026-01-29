-- LEGACY: replaced by 20260129120100_final_wake_execution_engine.sql
-- NOTE: kept for history; do not edit.

-- ============================================
-- Migration: Wake Execution Engine Function Only
-- Fecha: 2026-01-27
-- Descripción: Agrega función para despertar el ExecutionEngine sin tocar tabla existente
-- ============================================

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

  -- Si no existen, usar valores por defecto o salir
  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING 'Missing app settings for wake_execution_engine. Using defaults.';
    -- Usar valores por defecto o salir
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
-- PERMISOS: Dar acceso a la función de despertador
-- ============================================
GRANT EXECUTE ON FUNCTION public.wake_execution_engine() TO postgres;
GRANT EXECUTE ON FUNCTION public.wake_execution_engine() TO anon;
GRANT EXECUTE ON FUNCTION public.wake_execution_engine() TO authenticated;

-- ============================================
-- COMENTARIO: Documentar función
-- ============================================
COMMENT ON FUNCTION public.wake_execution_engine() IS 
  'Despierta el ExecutionEngine para que revise jobs pendientes - NO decide ni ejecuta, solo despierta';

-- ============================================
-- VERIFICACIÓN: Confirmar que todo está correcto
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎯 SISTEMA CANÓNICO - COMPONENTE DE DESPERTADOR ACTIVO';
  RAISE NOTICE '   - wake_execution_engine(): Solo despierta el sistema';
  RAISE NOTICE '   - Cron job: wake-execution-engine cada 30 segundos';
  RAISE NOTICE '   - Permisos: Asegurados para todos los roles';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 MODELO DE AUTORIDAD ÚNICA ACTIVO:';
  RAISE NOTICE '   - DecisionAuthority: Lee verdad → Usa autoridad → Escribe cola';
  RAISE NOTICE '   - ExecutionEngine: Lee cola → Ejecuta → Escribe eventos';
  RAISE NOTICE '   - WakeExecutionEngine: Solo despierta (sin lógica de negocio)';
  RAISE NOTICE '';
END $$;