-- ================================================
-- Cron Job: send-pending-emails
-- ================================================
-- Ejecuta la función send-pending-emails cada 5 minutos
-- ================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Eliminar job existente si existe (idempotente)
DO $$
BEGIN
  PERFORM cron.unschedule('send-pending-emails-job') 
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'send-pending-emails-job'
  );
END $$;

-- Nota: El cron job debe crearse desde el Dashboard de Supabase
-- porque necesita acceso a las variables de entorno (SUPABASE_URL, SERVICE_ROLE_KEY, CRON_SECRET)
-- que no están disponibles en SQL.
--
-- Pasos:
-- 1. Dashboard → Edge Functions → Cron Jobs → New
-- 2. Function: send-pending-emails
-- 3. Schedule: */5 * * * *
-- 4. Headers:
--    - Authorization: Bearer <SERVICE_ROLE_KEY>
--    - x-cron-secret: <CRON_SECRET>
--
-- O ejecutar manualmente desde psql con los valores correctos:
--
-- SELECT cron.schedule(
--   'send-pending-emails-job',
--   '*/5 * * * *',
--   format(
--     'SELECT net.http_post(url := %L, headers := %L, body := %L)',
--     'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/send-pending-emails',
--     '{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_SERVICE_ROLE_KEY>", "x-cron-secret": "<YOUR_CRON_SECRET>"}'::jsonb,
--     '{}'::jsonb
--   )
-- );

COMMENT ON EXTENSION pg_cron IS 'Cron jobs for send-pending-emails configured via Dashboard';
