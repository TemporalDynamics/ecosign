-- =============================================================================
-- CONFIGURACIÓN DE CRON JOBS PARA ECOSIGN
-- =============================================================================
-- Ejecutar en: Dashboard Supabase → SQL Editor
-- Fecha: 2025-11-30
-- =============================================================================

-- 1. PROCESS POLYGON ANCHORS (Cada 1 minuto)
-- Confirma anchors de Polygon que están pendientes
SELECT cron.schedule(
  'process-polygon-anchors',
  '*/1 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/process-polygon-anchors',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    );
  $$
);

-- 2. PROCESS BITCOIN ANCHORS (Cada 5 minutos)
-- Confirma anchors de Bitcoin (OpenTimestamps) que están pendientes
SELECT cron.schedule(
  'process-bitcoin-anchors',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/process-bitcoin-anchors',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    );
  $$
);

-- 3. SEND PENDING EMAILS (Cada 1 minuto)
-- Envía emails pendientes de notificaciones de workflows
SELECT cron.schedule(
  'send-pending-emails',
  '*/1 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/send-pending-emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    );
  $$
);

-- =============================================================================
-- VERIFICAR QUE LOS CRON JOBS ESTÉN ACTIVOS
-- =============================================================================
-- Ejecutar después de crear los cron jobs:

SELECT
  jobname,
  schedule,
  active,
  jobid
FROM cron.job
ORDER BY jobname;

-- Resultado esperado:
-- process-bitcoin-anchors  | */5 * * * * | true
-- process-polygon-anchors  | */1 * * * * | true
-- send-pending-emails      | */1 * * * * | true

-- =============================================================================
-- VER HISTORIAL DE EJECUCIONES (ÚLTIMAS 10)
-- =============================================================================
-- Para ver si los cron jobs se están ejecutando correctamente:

SELECT
  jobname,
  status,
  start_time,
  end_time,
  return_message
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;

-- =============================================================================
-- ELIMINAR UN CRON JOB (SI NECESITAS)
-- =============================================================================
-- Solo ejecutar si necesitas eliminar uno para recrearlo:

-- SELECT cron.unschedule('process-polygon-anchors');
-- SELECT cron.unschedule('process-bitcoin-anchors');
-- SELECT cron.unschedule('send-pending-emails');

-- =============================================================================
-- NOTAS IMPORTANTES
-- =============================================================================
--
-- 1. Los cron jobs usan el service_role_key automáticamente desde la configuración
-- 2. Polygon se procesa cada 1 minuto porque confirma rápido (10-30 seg)
-- 3. Bitcoin se procesa cada 5 minutos porque OpenTimestamps puede tardar horas
-- 4. Emails se envían cada 1 minuto para buena experiencia de usuario
-- 5. Los cron jobs se mantienen activos incluso después de redeploy de funciones
--
-- =============================================================================
