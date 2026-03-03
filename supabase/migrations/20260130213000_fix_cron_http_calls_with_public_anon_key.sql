-- Migration: Fix cron HTTP calls with public anon key
-- Date: 2026-01-30
--
-- Why this exists:
-- - Some environments cannot persist app.settings.* via ALTER DATABASE.
-- - Cron jobs must still be able to call Edge Functions through the gateway.
-- - Cron wrappers should resolve anon key at runtime (vault or app.settings).
--
-- IMPORTANT:
-- - Key is resolved from `vault.decrypted_secrets` (SUPABASE_ANON_KEY) first.
-- - Fallback is `app.settings.anon_key`.

CREATE OR REPLACE FUNCTION process_orchestrator_jobs()
RETURNS void AS $$
DECLARE
  supabase_url TEXT;
  anon_key TEXT;
  request_id BIGINT;
BEGIN
  supabase_url := 'https://uiyojopjbhooxrmamaiw.supabase.co';
  BEGIN
    SELECT decrypted_secret INTO anon_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_ANON_KEY';
  EXCEPTION
    WHEN undefined_table OR invalid_schema_name THEN
      anon_key := NULL;
  END;

  anon_key := COALESCE(anon_key, NULLIF(current_setting('app.settings.anon_key', true), ''));
  IF anon_key IS NULL THEN
    RAISE EXCEPTION 'Missing anon key for cron HTTP call (SUPABASE_ANON_KEY)';
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
  'Calls orchestrator via HTTP (cron). Resolves anon key from vault/app.settings.';

CREATE OR REPLACE FUNCTION public.wake_execution_engine()
RETURNS void AS $$
DECLARE
  supabase_url TEXT;
  anon_key TEXT;
  request_id BIGINT;
BEGIN
  supabase_url := 'https://uiyojopjbhooxrmamaiw.supabase.co';
  BEGIN
    SELECT decrypted_secret INTO anon_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_ANON_KEY';
  EXCEPTION
    WHEN undefined_table OR invalid_schema_name THEN
      anon_key := NULL;
  END;

  anon_key := COALESCE(anon_key, NULLIF(current_setting('app.settings.anon_key', true), ''));
  IF anon_key IS NULL THEN
    RAISE EXCEPTION 'Missing anon key for cron HTTP call (SUPABASE_ANON_KEY)';
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
  'Calls fase1-executor via HTTP (cron). Resolves anon key from vault/app.settings.';
