-- ================================================
-- Create Cron Job: send-pending-emails
-- ================================================
-- IMPORTANTE: Antes de ejecutar este script, reemplazá los placeholders:
-- - <SERVICE_ROLE_KEY>: Dashboard → Settings → API → service_role key
-- - <CRON_SECRET>: supabase secrets list | grep CRON_SECRET (valor real)
-- ================================================

-- Eliminar cron existente si existe (idempotente)
SELECT cron.unschedule('send-pending-emails-job')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-pending-emails-job'
);

-- Crear el cron job
-- Ejecuta send-pending-emails cada 5 minutos
SELECT cron.schedule(
  'send-pending-emails-job',                    -- Job name
  '*/5 * * * *',                                -- Every 5 minutes (cron syntax)
  format(
    $cmd$
    SELECT net.http_post(
      url := 'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/send-pending-emails',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer %s", "x-cron-secret": "%s"}'::jsonb,
      body := '{}'::jsonb
    );
    $cmd$,
    '<SERVICE_ROLE_KEY>',  -- ⚠️ REEMPLAZAR CON VALOR REAL
    '<CRON_SECRET>'        -- ⚠️ REEMPLAZAR CON VALOR REAL
  )
);

-- Verificar que se creó correctamente
SELECT
  jobid,
  jobname,
  schedule,
  active,
  LEFT(command, 100) || '...' as command_preview
FROM cron.job
WHERE jobname = 'send-pending-emails-job';

-- Resultado esperado:
-- jobname: send-pending-emails-job
-- schedule: */5 * * * *
-- active: t (true)
