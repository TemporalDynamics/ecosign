-- Migration: Single cron tick for decision + execution
-- Date: 2026-01-31
-- Purpose:
-- Run a single cron job that:
-- 1) reclaims stale executor_jobs
-- 2) invokes fase1-executor (decision)
-- 3) invokes orchestrator (execution)
--
-- This replaces the need for separate orchestrator/wake jobs.

CREATE OR REPLACE FUNCTION public.runtime_tick()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  request_id bigint;
  reclaim_result jsonb;
BEGIN
  -- Reclaim first
  BEGIN
    SELECT public.reclaim_stale_jobs() INTO reclaim_result;
    RAISE NOTICE '[runtime_tick] Reclaim: % reclaimed, % dead',
      reclaim_result->>'reclaimed_count',
      reclaim_result->>'dead_count';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[runtime_tick] Reclaim error: %', SQLERRM;
  END;

  -- Vault secrets
  SELECT secret INTO supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_URL'
  LIMIT 1;

  SELECT secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING '[runtime_tick] Missing vault secrets (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY); skipping tick.';
    RETURN;
  END IF;

  -- Decision first
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/fase1-executor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', service_role_key,
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object('source', 'runtime_tick')
  ) INTO request_id;
  RAISE NOTICE '[runtime_tick] fase1-executor called, request_id=%', request_id;

  -- Execution next
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/orchestrator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', service_role_key,
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  ) INTO request_id;
  RAISE NOTICE '[runtime_tick] orchestrator called, request_id=%', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[runtime_tick] Error: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.runtime_tick() IS
  'Single cron tick: reclaim stale jobs, invoke fase1-executor (decision), then orchestrator (execution). Uses vault secrets.';


-- Schedule a single cron job (every minute)
DO $$
BEGIN
  PERFORM cron.unschedule('runtime-tick');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule('runtime-tick', '*/1 * * * *', $$SELECT public.runtime_tick();$$);


-- Disable legacy tick jobs if they exist (decision/execution tick should be single)
DO $$
BEGIN
  PERFORM cron.unschedule('orchestrator-poll-jobs');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('wake-execution-engine');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('invoke-fase1-executor');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
