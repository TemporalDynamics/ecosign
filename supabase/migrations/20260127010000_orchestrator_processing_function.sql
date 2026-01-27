-- ============================================
-- Migration: Orchestrator Processing Function
-- Fecha: 2026-01-27
-- Descripción: Crea función para procesar jobs del orchestrator
-- ============================================

-- Crear función que procesa jobs pendientes
CREATE OR REPLACE FUNCTION process_orchestrator_jobs()
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
    RAISE WARNING 'Missing app settings for orchestrator call. Using defaults.';
    -- Usar valores por defecto o salir
    RETURN;
  END IF;

  -- Registrar que se está ejecutando
  RAISE NOTICE 'process_orchestrator_jobs: Processing pending jobs...';

  -- Llamar al orchestrator vía HTTP para que procese jobs pendientes
  -- Enviar un POST vacío para que el orchestrator haga polling de jobs pendientes
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/orchestrator',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_role_key,
      'Content-Type', 'application/json'
    ),
    body := '{}'  -- Body vacío para que el orchestrator haga polling
  ) INTO request_id;

  -- Registrar resultado
  RAISE NOTICE 'process_orchestrator_jobs: Orchestrator called, request_id=%', request_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'process_orchestrator_jobs: Error calling orchestrator: %', SQLERRM;
    -- No lanzar error para que el cron no falle
END;
$$ LANGUAGE plpgsql;

-- Dar permisos para que el cron la ejecute
GRANT EXECUTE ON FUNCTION process_orchestrator_jobs() TO postgres;
GRANT EXECUTE ON FUNCTION process_orchestrator_jobs() TO anon;
GRANT EXECUTE ON FUNCTION process_orchestrator_jobs() TO authenticated;