-- Reactivate anchor confirmation workers in canonical runtime.
-- Rationale:
-- - anchor-polygon / anchor-bitcoin enqueue records in anchors.
-- - confirmation and final event emission is executed by process-* workers.
-- - these crons were unscheduled on 2026-02-15 and must be active again.

CREATE OR REPLACE FUNCTION public.run_process_polygon_anchors()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
BEGIN
  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_URL'
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  ORDER BY created_at DESC
  LIMIT 1;

  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING '[run_process_polygon_anchors] Missing vault secrets (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY); skipping invoke.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/process-polygon-anchors',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', service_role_key,
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[run_process_polygon_anchors] Error invoking worker: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_process_bitcoin_anchors()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
BEGIN
  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_URL'
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  ORDER BY created_at DESC
  LIMIT 1;

  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING '[run_process_bitcoin_anchors] Missing vault secrets (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY); skipping invoke.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/process-bitcoin-anchors',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', service_role_key,
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[run_process_bitcoin_anchors] Error invoking worker: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.run_process_polygon_anchors() IS
  'Cron wrapper for process-polygon-anchors using Vault secrets.';

COMMENT ON FUNCTION public.run_process_bitcoin_anchors() IS
  'Cron wrapper for process-bitcoin-anchors using Vault secrets.';

DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('process-polygon-anchors');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '[reactivate_anchor_crons] process-polygon-anchors was not scheduled: %', SQLERRM;
  END;

  BEGIN
    PERFORM cron.unschedule('process-bitcoin-anchors');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '[reactivate_anchor_crons] process-bitcoin-anchors was not scheduled: %', SQLERRM;
  END;

  PERFORM cron.schedule(
    'process-polygon-anchors',
    '*/1 * * * *',
    'SELECT public.run_process_polygon_anchors();'
  );

  PERFORM cron.schedule(
    'process-bitcoin-anchors',
    '*/5 * * * *',
    'SELECT public.run_process_bitcoin_anchors();'
  );
END
$$;
