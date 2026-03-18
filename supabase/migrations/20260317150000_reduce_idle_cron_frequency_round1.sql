-- =============================================================================
-- Migration: Reduce idle cron frequency (Round 1)
-- Date: 2026-03-17
-- =============================================================================
--
-- CONTEXT:
-- With zero active users, 4 pg_cron jobs generate ~4,608 Edge Function
-- invocations/day. This first round targets the two highest-cost idle jobs:
--
--   1. runtime-tick (*/1 → */5)
--      - Fires 2 net.http_post per execution (fase1-executor + orchestrator)
--      - fase1-executor does 4+ DB queries even with no work (syncFlags,
--        emitMissingTsaMonitoringEvents, heartbeat, claim_initial_decision_jobs)
--      - Reduction: 1,440 → 288 SQL executions/day, 2,880 → 576 Edge calls/day
--
--   2. process-polygon-anchors (*/1 → */5)
--      - Each idle invocation: auth + worker_heartbeat + claimAnchorBatch(25)
--      - No external RPC calls when idle (ethers provider only used in loop)
--      - Reduction: 1,440 → 288 Edge Function calls/day
--
-- NOT CHANGED in this round (intentional):
--   - process-bitcoin-anchors: already */5, low marginal gain, don't touch latency
--   - recover-orphan-anchors: SQL-only, near-zero idle cost, defensive function
--
-- TRADEOFF:
-- With */5, the worst-case delay for a newly enqueued job to be picked up
-- increases from ~1 min to ~5 min. For a beta with 1 broker + 10 agents
-- this is acceptable. If real-time anchoring becomes critical, revert.
--
-- POST-DEPLOY OBSERVATION (48-72h):
--   - Supabase Dashboard → Usage → Egress: expect ~60-70% reduction in
--     Edge Function baseline
--   - GET /health-check: verify crons still report active
--   - Monitor anchors table: no increase in queued/pending backlog
--
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. runtime-tick: */1 → */5
-- ---------------------------------------------------------------------------
DO $outer$
BEGIN
  -- Remove existing schedule (safe if not found)
  BEGIN
    PERFORM cron.unschedule('runtime-tick');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '[reduce_idle_cron] runtime-tick was not scheduled: %', SQLERRM;
  END;

  -- Reschedule at reduced frequency
  PERFORM cron.schedule(
    'runtime-tick',
    '*/5 * * * *',
    $$SELECT public.runtime_tick();$$
  );

  RAISE NOTICE '[reduce_idle_cron] runtime-tick rescheduled: */1 -> */5';
END
$outer$;

-- ---------------------------------------------------------------------------
-- 2. process-polygon-anchors: */1 → */5
-- ---------------------------------------------------------------------------
DO $outer$
BEGIN
  BEGIN
    PERFORM cron.unschedule('process-polygon-anchors');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '[reduce_idle_cron] process-polygon-anchors was not scheduled: %', SQLERRM;
  END;

  PERFORM cron.schedule(
    'process-polygon-anchors',
    '*/5 * * * *',
    'SELECT public.run_process_polygon_anchors();'
  );

  RAISE NOTICE '[reduce_idle_cron] process-polygon-anchors rescheduled: */1 -> */5';
END
$outer$;

-- =============================================================================
-- ROLLBACK (copy-paste to revert):
-- =============================================================================
--
-- DO $outer$
-- BEGIN
--   BEGIN
--     PERFORM cron.unschedule('runtime-tick');
--   EXCEPTION WHEN OTHERS THEN NULL;
--   END;
--   PERFORM cron.schedule(
--     'runtime-tick',
--     '*/1 * * * *',
--     $$SELECT public.runtime_tick();$$
--   );
--
--   BEGIN
--     PERFORM cron.unschedule('process-polygon-anchors');
--   EXCEPTION WHEN OTHERS THEN NULL;
--   END;
--   PERFORM cron.schedule(
--     'process-polygon-anchors',
--     '*/1 * * * *',
--     'SELECT public.run_process_polygon_anchors();'
--   );
-- END
-- $outer$;
-- =============================================================================
