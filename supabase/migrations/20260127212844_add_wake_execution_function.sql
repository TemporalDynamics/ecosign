-- ============================================
-- Migration: Add Wake Execution Engine Function
-- Fecha: 2026-01-27
-- Descripción: Agrega función para despertar el ExecutionEngine sin tocar tablas existentes
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
-- VERIFICACIÓN: Confirmar que la función existe
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Función wake_execution_engine creada exitosamente';
  RAISE NOTICE '   - Nombre: wake_execution_engine()';
  RAISE NOTICE '   - Propósito: Despertar ExecutionEngine (sin lógica de negocio)';
  RAISE NOTICE '   - Permisos: Asegurados para todos los roles';
  RAISE NOTICE '';
END $$;