-- Verificar estado de cron jobs
SELECT
  jobname,
  schedule,
  active,
  CASE
    WHEN active THEN '✅ ACTIVO'
    ELSE '❌ INACTIVO'
  END as status,
  jobid
FROM cron.job
WHERE jobname IN ('process-polygon-anchors', 'process-bitcoin-anchors')
ORDER BY jobname;

-- Ver últimas ejecuciones (si existen)
SELECT
  j.jobname,
  r.status,
  r.return_message,
  r.start_time
FROM cron.job_run_details r
JOIN cron.job j ON r.jobid = j.jobid
WHERE j.jobname IN ('process-polygon-anchors', 'process-bitcoin-anchors')
ORDER BY r.start_time DESC
LIMIT 10;
