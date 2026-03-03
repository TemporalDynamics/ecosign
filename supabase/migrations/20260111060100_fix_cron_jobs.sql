-- =====================================================================
-- FIX: Blockchain Anchoring Cron Jobs - READY TO EXECUTE
-- =====================================================================
-- Fecha: 2026-01-11
-- Propósito: Recrear cron jobs de Polygon y Bitcoin con auth correcta
-- =====================================================================

-- PASO 1: Ver estado actual
SELECT
  jobname,
  schedule,
  active,
  jobid
FROM cron.job
WHERE jobname IN ('process-polygon-anchors', 'process-bitcoin-anchors')
ORDER BY jobname;

-- PASO 2: Eliminar cron jobs existentes
DO $$
BEGIN
  PERFORM cron.unschedule('process-polygon-anchors');
  PERFORM cron.unschedule('process-bitcoin-anchors');
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignorar si no existen
END $$;

-- PASO 3: Recrear process-polygon-anchors (cada 1 minuto)
SELECT cron.schedule(
  'process-polygon-anchors',
  '*/1 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/process-polygon-anchors',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
        )
      )
    );
  $$
);

-- PASO 4: Recrear process-bitcoin-anchors (cada 5 minutos)
SELECT cron.schedule(
  'process-bitcoin-anchors',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/process-bitcoin-anchors',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
        )
      )
    );
  $$
);

-- PASO 5: Verificar que quedaron activos
SELECT
  jobname,
  schedule,
  active,
  CASE
    WHEN active THEN '✅ ACTIVO'
    ELSE '❌ INACTIVO'
  END as status
FROM cron.job
WHERE jobname IN ('process-polygon-anchors', 'process-bitcoin-anchors')
ORDER BY jobname;
