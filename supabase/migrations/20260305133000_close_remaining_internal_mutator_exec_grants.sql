-- P1 hardening follow-up:
-- Close remaining SECURITY DEFINER mutator RPC surfaces to internal roles only.
-- Rationale:
-- - These functions mutate queue/runtime/projection/canonical state.
-- - They must not be executable by anon/authenticated clients.

DO $$
DECLARE
  fn REGPROCEDURE;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(ARRAY[
        'reclaim_stale_jobs',
        'update_job_heartbeat',
        'anchor_atomic_tx',
        'anchor_polygon_atomic_tx',
        'detect_and_recover_orphan_anchors',
        'project_document_entity_to_user_document',
        'claim_anchor_batch'
      ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO postgres', fn);
  END LOOP;
END $$;
