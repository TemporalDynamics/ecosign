-- Disable legacy anchor confirmation crons after canonical authority convergence
-- Date: 2026-02-15

DO $$
BEGIN
  PERFORM cron.unschedule('process-polygon-anchors');
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'cron unschedule skipped for process-polygon-anchors: %', SQLERRM;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('process-bitcoin-anchors');
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'cron unschedule skipped for process-bitcoin-anchors: %', SQLERRM;
END $$;
