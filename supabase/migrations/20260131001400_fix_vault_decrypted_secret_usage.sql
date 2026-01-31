-- Migration: Fix Vault secret selection for cron wrappers
-- Date: 2026-01-31
-- Purpose:
-- vault.decrypted_secrets exposes both `secret` (encrypted/ciphertext-like) and
-- `decrypted_secret` (plaintext). Our cron wrappers must use decrypted_secret.
--
-- Symptoms when using `secret`:
-- - pg_net errors: "A libcurl function was given a bad argument" (invalid URL)
-- - 403 Forbidden (invalid Authorization)
-- - runtime-tick appears to run but never invokes workers

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

  -- Vault secrets (PLAINTEXT)
  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_URL'
  LIMIT 1;

  SELECT decrypted_secret INTO service_role_key
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
  'Single cron tick: reclaim stale jobs, invoke fase1-executor, then orchestrator. Uses vault.decrypted_secrets.decrypted_secret for SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.';


CREATE OR REPLACE FUNCTION public.process_orchestrator_jobs()
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
  BEGIN
    SELECT public.reclaim_stale_jobs() INTO reclaim_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[process_orchestrator_jobs] Reclaim error: %', SQLERRM;
  END;

  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_URL'
  LIMIT 1;

  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING '[process_orchestrator_jobs] Missing vault secrets; skipping invoke.';
    RETURN;
  END IF;

  SELECT net.http_post(
    url := supabase_url || '/functions/v1/orchestrator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', service_role_key,
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  ) INTO request_id;

  RAISE NOTICE '[process_orchestrator_jobs] Orchestrator called, request_id=%', request_id;
END;
$$;


CREATE OR REPLACE FUNCTION public.wake_execution_engine()
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
  BEGIN
    SELECT public.reclaim_stale_jobs() INTO reclaim_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[wake_execution_engine] Reclaim error: %', SQLERRM;
  END;

  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_URL'
  LIMIT 1;

  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING '[wake_execution_engine] Missing vault secrets; skipping invoke.';
    RETURN;
  END IF;

  SELECT net.http_post(
    url := supabase_url || '/functions/v1/fase1-executor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', service_role_key,
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object('source', 'wake_execution_engine')
  ) INTO request_id;

  RAISE NOTICE '[wake_execution_engine] fase1-executor called, request_id=%', request_id;
END;
$$;
