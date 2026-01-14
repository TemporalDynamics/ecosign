-- Test webhook: insert a signer.signed event
-- Run this in Supabase SQL Editor to test if webhook fires

INSERT INTO workflow_events (
  workflow_id,
  signer_id,
  event_type,
  payload
) VALUES (
  gen_random_uuid(),
  gen_random_uuid(),
  'signer.signed',
  '{}'::jsonb
);

-- Then check:
-- 1. Database → Webhooks → process-signer-signed-webhook → Delivery Logs
-- 2. You should see a 200 OK or some HTTP status code
-- 3. If you see NOTHING, you're using wrong webhook type ("Edge Function" instead of "HTTP Request")
