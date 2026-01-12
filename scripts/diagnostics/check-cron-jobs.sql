-- Consultar todos los cron jobs existentes
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active,
  jobid
FROM cron.job
ORDER BY jobname;
