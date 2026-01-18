-- Fix anchoring cron auth to use vault secrets instead of app.settings
-- Ensures deterministic Authorization header for internal calls

CREATE OR REPLACE FUNCTION public.invoke_process_polygon_anchors()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  supabase_url text := 'https://uiyojopjbhooxrmamaiw.supabase.co';
  service_role_key text;
  request_id bigint;
BEGIN
  SELECT secret
    INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  IF service_role_key IS NULL THEN
    RAISE WARNING 'process-polygon-anchors cron: SUPABASE_SERVICE_ROLE_KEY not found in vault.decrypted_secrets';
    RETURN;
  END IF;

  SELECT net.http_post(
    url := supabase_url || '/functions/v1/process-polygon-anchors',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key,
      'apikey', service_role_key
    )
  ) INTO request_id;

  RAISE NOTICE 'process-polygon-anchors cron invoked: request_id=%', request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.invoke_process_bitcoin_anchors()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  supabase_url text := 'https://uiyojopjbhooxrmamaiw.supabase.co';
  service_role_key text;
  request_id bigint;
BEGIN
  SELECT secret
    INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  IF service_role_key IS NULL THEN
    RAISE WARNING 'process-bitcoin-anchors cron: SUPABASE_SERVICE_ROLE_KEY not found in vault.decrypted_secrets';
    RETURN;
  END IF;

  SELECT net.http_post(
    url := supabase_url || '/functions/v1/process-bitcoin-anchors',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key,
      'apikey', service_role_key
    )
  ) INTO request_id;

  RAISE NOTICE 'process-bitcoin-anchors cron invoked: request_id=%', request_id;
END;
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('process-polygon-anchors');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('process-bitcoin-anchors');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
  'process-polygon-anchors',
  '*/1 * * * *',
  $$SELECT public.invoke_process_polygon_anchors();$$
);

SELECT cron.schedule(
  'process-bitcoin-anchors',
  '*/5 * * * *',
  $$SELECT public.invoke_process_bitcoin_anchors();$$
);
