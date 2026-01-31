-- Migration: Make cron wrappers vault-based (no hardcoded URL/keys)
-- Date: 2026-01-31
-- Purpose:
-- Replace hardcoded supabase_url / anon_key usage in cron wrappers with Vault secrets.
-- This improves portability across environments and avoids embedding tokens in SQL.

CREATE OR REPLACE FUNCTION process_orchestrator_jobs()
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
  -- Reclaim stale jobs before invoking worker
  BEGIN
    SELECT public.reclaim_stale_jobs() INTO reclaim_result;
    RAISE NOTICE '[process_orchestrator_jobs] Reclaim: % reclaimed, % dead',
      reclaim_result->>'reclaimed_count',
      reclaim_result->>'dead_count';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[process_orchestrator_jobs] Reclaim error: %', SQLERRM;
  END;

  SELECT secret INTO supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_URL'
  LIMIT 1;

  SELECT secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING '[process_orchestrator_jobs] Missing vault secrets (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY); skipping invoke.';
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
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[process_orchestrator_jobs] Error: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION process_orchestrator_jobs() IS
  'Cron wrapper: reclaims stale jobs, then invokes orchestrator via HTTP. Uses vault secrets (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).';


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
  -- Reclaim stale jobs before invoking worker
  BEGIN
    SELECT public.reclaim_stale_jobs() INTO reclaim_result;
    RAISE NOTICE '[wake_execution_engine] Reclaim: % reclaimed, % dead',
      reclaim_result->>'reclaimed_count',
      reclaim_result->>'dead_count';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[wake_execution_engine] Reclaim error: %', SQLERRM;
  END;

  SELECT secret INTO supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_URL'
  LIMIT 1;

  SELECT secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING '[wake_execution_engine] Missing vault secrets (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY); skipping invoke.';
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
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[wake_execution_engine] Error: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.wake_execution_engine() IS
  'Cron wrapper: reclaims stale jobs, then invokes fase1-executor via HTTP. Uses vault secrets (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).';
