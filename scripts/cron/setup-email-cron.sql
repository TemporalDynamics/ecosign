-- ============================================
-- Email Cron Job Setup
-- ============================================
-- Configura pg_cron para ejecutar send-pending-emails cada 5 minutos
--
-- INSTRUCCIONES:
-- 1. Copiar este SQL
-- 2. Ir a Supabase Dashboard → SQL Editor
-- 3. Pegar y ejecutar
-- ============================================

-- Habilitar extensión pg_cron si no está habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Crear cron job que ejecuta cada 5 minutos
SELECT cron.schedule(
  'send-pending-emails-job',           -- nombre del job
  '*/5 * * * *',                       -- cada 5 minutos
  $$
  SELECT
    net.http_post(
      url := 'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/send-pending-emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <YOUR-ANON-KEY>'
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- ============================================
-- IMPORTANTE: Reemplazar antes de ejecutar:
-- ============================================
-- <YOUR-PROJECT-REF> → Tu project reference (ej: abcdefghijklmnop)
-- <YOUR-ANON-KEY> → Tu anon/public key de Supabase
--
-- Los encontrás en:
-- Project Settings → API → Project URL y anon/public key
-- ============================================

-- Verificar que el job fue creado
SELECT * FROM cron.job WHERE jobname = 'send-pending-emails-job';

-- Ver logs de ejecuciones (después de 5 minutos)
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-pending-emails-job')
-- ORDER BY start_time DESC
-- LIMIT 10;
