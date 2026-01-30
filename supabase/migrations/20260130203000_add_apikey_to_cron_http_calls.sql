-- Migration: Add apikey/Authorization to cron HTTP calls
-- Date: 2026-01-30
--
-- Problem:
-- - Supabase Edge Functions gateway requires an API key header.
-- - process_orchestrator_jobs() and wake_execution_engine() were calling functions with only Content-Type.
-- - Result: cron runs "succeeded" but workers are never invoked; executor_jobs stays queued.
--
-- Fix:
-- - Read anon key from app.settings.anon_key and send it as apikey + Authorization.
-- - Use hardcoded project URL (non-secret) as before.

CREATE OR REPLACE FUNCTION process_orchestrator_jobs()
RETURNS void AS $$
DECLARE
  supabase_url TEXT;
  anon_key TEXT;
  request_id BIGINT;
BEGIN
  supabase_url := 'https://uiyojopjbhooxrmamaiw.supabase.co';
  anon_key := current_setting('app.settings.anon_key', true);

  IF anon_key IS NULL OR anon_key = '' THEN
    RAISE WARNING '[process_orchestrator_jobs] Missing app.settings.anon_key; cannot call orchestrator';
    RETURN;
  END IF;

  SELECT net.http_post(
    url := supabase_url || '/functions/v1/orchestrator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', anon_key,
      'Authorization', 'Bearer ' || anon_key
    ),
    body := '{}'::jsonb
  ) INTO request_id;

  RAISE NOTICE '[process_orchestrator_jobs] Orchestrator llamado, request_id=%', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[process_orchestrator_jobs] Error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_orchestrator_jobs() IS
  'Calls orchestrator via HTTP (cron). Requires app.settings.anon_key for gateway apikey.';

CREATE OR REPLACE FUNCTION public.wake_execution_engine()
RETURNS void AS $$
DECLARE
  supabase_url TEXT;
  anon_key TEXT;
  request_id BIGINT;
BEGIN
  supabase_url := 'https://uiyojopjbhooxrmamaiw.supabase.co';
  anon_key := current_setting('app.settings.anon_key', true);

  IF anon_key IS NULL OR anon_key = '' THEN
    RAISE WARNING '[wake_execution_engine] Missing app.settings.anon_key; cannot call fase1-executor';
    RETURN;
  END IF;

  SELECT net.http_post(
    url := supabase_url || '/functions/v1/fase1-executor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', anon_key,
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object('source', 'wake_execution_engine')
  ) INTO request_id;

  RAISE NOTICE '[wake_execution_engine] fase1-executor llamado, request_id=%', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[wake_execution_engine] Error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.wake_execution_engine() IS
  'Calls fase1-executor via HTTP (cron). Requires app.settings.anon_key for gateway apikey.';
