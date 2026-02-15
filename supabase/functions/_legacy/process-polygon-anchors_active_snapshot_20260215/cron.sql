-- Schedule process-polygon-anchors every minute (uses vault via invoke_process_polygon_anchors)
SELECT cron.schedule(
  'process-polygon-anchors',
  '*/1 * * * *',
  $$SELECT public.invoke_process_polygon_anchors();$$
);
