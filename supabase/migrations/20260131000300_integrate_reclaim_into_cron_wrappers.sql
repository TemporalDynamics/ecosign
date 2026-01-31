-- Migration: Integrate reclaim_stale_jobs() into cron wrappers
-- Purpose: Execute TTL reclaim BEFORE invoking workers
-- Part of: TTL Reclaim + Heartbeat (Fase 1.2)

-- Update process_orchestrator_jobs() to call reclaim first
CREATE OR REPLACE FUNCTION process_orchestrator_jobs()
RETURNS void AS $$
DECLARE
  supabase_url TEXT;
  anon_key TEXT;
  request_id BIGINT;
  reclaim_result jsonb;
BEGIN
  -- Step 1: Reclaim stale jobs before invoking worker
  BEGIN
    SELECT public.reclaim_stale_jobs() INTO reclaim_result;
    RAISE NOTICE '[process_orchestrator_jobs] Reclaim: % reclaimed, % dead',
      reclaim_result->>'reclaimed_count',
      reclaim_result->>'dead_count';
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail - continue to invoke worker
    RAISE WARNING '[process_orchestrator_jobs] Reclaim error: %', SQLERRM;
  END;

  -- Step 2: Invoke orchestrator worker
  supabase_url := 'https://uiyojopjbhooxrmamaiw.supabase.co';
  -- Public project anon key (JWT)
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpeW9qb3BqYmhvb3hybWFtYWl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzAyMTUsImV4cCI6MjA3OTI0NjIxNX0.3xQ3db1dmTyAsbOtdJt4zpplG8RcnkxqCQR5wWkvFxk';

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
  'Calls orchestrator via HTTP (cron). Reclaims stale jobs first. Uses public anon key to satisfy gateway apikey.';

-- Update wake_execution_engine() to call reclaim first
CREATE OR REPLACE FUNCTION public.wake_execution_engine()
RETURNS void AS $$
DECLARE
  supabase_url TEXT;
  anon_key TEXT;
  request_id BIGINT;
  reclaim_result jsonb;
BEGIN
  -- Step 1: Reclaim stale jobs before invoking worker
  BEGIN
    SELECT public.reclaim_stale_jobs() INTO reclaim_result;
    RAISE NOTICE '[wake_execution_engine] Reclaim: % reclaimed, % dead',
      reclaim_result->>'reclaimed_count',
      reclaim_result->>'dead_count';
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail - continue to invoke worker
    RAISE WARNING '[wake_execution_engine] Reclaim error: %', SQLERRM;
  END;

  -- Step 2: Invoke fase1-executor worker
  supabase_url := 'https://uiyojopjbhooxrmamaiw.supabase.co';
  -- Public project anon key (JWT)
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpeW9qb3BqYmhvb3hybWFtYWl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzAyMTUsImV4cCI6MjA3OTI0NjIxNX0.3xQ3db1dmTyAsbOtdJt4zpplG8RcnkxqCQR5wWkvFxk';

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
  'Calls fase1-executor via HTTP (cron). Reclaims stale jobs first. Uses public anon key to satisfy gateway apikey.';
