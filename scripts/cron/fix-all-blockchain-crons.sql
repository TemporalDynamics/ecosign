-- =====================================================================
-- FIX: Todos los Cron Jobs de Blockchain Anchoring
-- =====================================================================
-- Fecha: 2026-01-11
-- Propósito: Recrear cron jobs de Polygon y Bitcoin con auth correcta
-- Problema: current_setting('app.settings.service_role_key') no existe
-- Solución: Hardcodear service_role_key en el SQL
-- =====================================================================

-- ⚠️ IMPORTANTE: Reemplazar 'TU_SERVICE_ROLE_KEY_AQUI' con el key real
-- Obtener desde: Dashboard → Settings → API → service_role (secret)

-- =====================================================================
-- PASO 1: Ver estado actual de cron jobs
-- =====================================================================
SELECT
  jobname,
  schedule,
  active,
  jobid
FROM cron.job
WHERE jobname IN ('process-polygon-anchors', 'process-bitcoin-anchors', 'send-pending-emails')
ORDER BY jobname;

-- =====================================================================
-- PASO 2: Eliminar cron jobs existentes (los que fallan)
-- =====================================================================
SELECT cron.unschedule('process-polygon-anchors');
SELECT cron.unschedule('process-bitcoin-anchors');

-- =====================================================================
-- PASO 3: Recrear process-polygon-anchors (cada 1 minuto)
-- =====================================================================
SELECT cron.schedule(
  'process-polygon-anchors',
  '*/1 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/process-polygon-anchors',
      headers := jsonb_build_object(
        'Authorization', 'Bearer TU_SERVICE_ROLE_KEY_AQUI'
      )
    );
  $$
);

-- =====================================================================
-- PASO 4: Recrear process-bitcoin-anchors (cada 5 minutos)
-- =====================================================================
SELECT cron.schedule(
  'process-bitcoin-anchors',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/process-bitcoin-anchors',
      headers := jsonb_build_object(
        'Authorization', 'Bearer TU_SERVICE_ROLE_KEY_AQUI'
      )
    );
  $$
);

-- =====================================================================
-- PASO 5: Verificar que quedaron activos
-- =====================================================================
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

-- =====================================================================
-- RESULTADO ESPERADO:
-- =====================================================================
-- process-bitcoin-anchors  | */5 * * * * | true | ✅ ACTIVO
-- process-polygon-anchors  | */1 * * * * | true | ✅ ACTIVO

-- =====================================================================
-- PASO 6: Esperar 5 minutos y verificar ejecuciones
-- =====================================================================
-- Polygon (debería ejecutarse cada minuto)
SELECT
  jobname,
  status,
  return_message,
  start_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-polygon-anchors')
ORDER BY runid DESC
LIMIT 5;

-- Bitcoin (debería ejecutarse cada 5 minutos)
SELECT
  jobname,
  status,
  return_message,
  start_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-bitcoin-anchors')
ORDER BY runid DESC
LIMIT 5;

-- =====================================================================
-- PASO 7: Verificar que documentos se procesan
-- =====================================================================
-- Polygon pendientes (debería bajar rápido)
SELECT COUNT(*) as polygon_pending
FROM user_documents
WHERE polygon_status = 'pending';

-- Bitcoin pendientes (puede tardar horas en confirmar)
SELECT COUNT(*) as bitcoin_pending
FROM user_documents
WHERE bitcoin_status = 'pending';

-- =====================================================================
-- NOTAS:
-- =====================================================================
-- - Polygon confirma en ~30 segundos, worker corre cada 1 min
-- - Bitcoin puede tardar horas (OpenTimestamps aggregation), worker corre cada 5 min
-- - Si después de recrear los crons siguen fallando, revisar:
--   1. service_role_key correcto
--   2. Edge Functions deployadas
--   3. Variables de entorno (POLYGON_RPC_URL, etc)
