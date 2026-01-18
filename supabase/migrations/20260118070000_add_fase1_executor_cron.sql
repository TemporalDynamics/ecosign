-- Add cron invocation for fase1-executor with vault-based auth

CREATE OR REPLACE FUNCTION public.invoke_fase1_executor()
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
    RAISE WARNING 'fase1-executor cron: SUPABASE_SERVICE_ROLE_KEY not found in vault.decrypted_secrets';
    RETURN;
  END IF;

  SELECT net.http_post(
    url := supabase_url || '/functions/v1/fase1-executor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key,
      'apikey', service_role_key
    ),
    body := jsonb_build_object('limit', 5)
  ) INTO request_id;

  RAISE NOTICE 'fase1-executor cron invoked: request_id=%', request_id;
END;
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('invoke-fase1-executor');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
  'invoke-fase1-executor',
  '*/1 * * * *',
  $$SELECT public.invoke_fase1_executor();$$
);
