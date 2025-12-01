-- Schedule process-bitcoin-anchors every 5 minutes using Supabase cron.
-- Run this in SQL editor (replace your project ref if needed for invocation URL).
SELECT cron.schedule(
  'process-bitcoin-anchors',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://<your-project-ref>.supabase.co/functions/v1/process-bitcoin-anchors',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    );
  $$
);
