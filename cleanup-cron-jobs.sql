-- ============================================================================
-- Script para limpiar cron jobs duplicados
-- INSTRUCCIONES:
-- 1. Primero ejecuta check-cron-jobs.sql para ver qué jobs existen
-- 2. Luego ajusta este script según los nombres que veas
-- 3. Ejecuta este script para limpiar
-- ============================================================================

-- Ver los jobs actuales antes de eliminar
SELECT jobid, jobname, schedule, active
FROM cron.job
ORDER BY jobname;

-- OPCIÓN 1: Eliminar solo 'send-pending-mails' (el que nunca se ejecutó)
-- Descomenta la línea siguiente si este job existe:
-- SELECT cron.unschedule('send-pending-mails');

-- OPCIÓN 2: Eliminar ambos jobs y crear uno limpio
-- Descomenta las líneas siguientes si quieres empezar de cero:
-- SELECT cron.unschedule('send-pending-mails');
-- SELECT cron.unschedule('send_emails_pending_job');

-- Verificar que se eliminaron
SELECT jobid, jobname, schedule, active
FROM cron.job
ORDER BY jobname;
