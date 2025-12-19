-- Schedule process-polygon-anchors every minute
SELECT cron.schedule(
  'process-polygon-anchors',
  '*/1 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://<your-project-ref>.supabase.co/functions/v1/process-polygon-anchors',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    );
  $$
);
