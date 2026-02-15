-- Schedule process-bitcoin-anchors every 5 minutes (uses vault via invoke_process_bitcoin_anchors)
SELECT cron.schedule(
  'process-bitcoin-anchors',
  '*/5 * * * *',
  $$SELECT public.invoke_process_bitcoin_anchors();$$
);
