-- Close remaining internal SECURITY DEFINER execute surface.
-- Uses dynamic resolution by function name to avoid failing in environments
-- where a subset of legacy helpers may not exist.

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
        'check_and_expire_shares',
        'claim_signer_for_signing',
        'expire_signer_links',
        'handle_new_user',
        'notify_creator_on_signature',
        'notify_signature_completed',
        'notify_signer_link',
        'notify_workflow_completed',
        'project_events_to_user_document',
        'queue_system_welcome_email',
        'queue_welcome_email',
        'release_signer_signing_lock',
        'release_workflow_signing_lock',
        'trigger_blockchain_anchoring',
        'worker_heartbeat'
      ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO postgres', fn);
  END LOOP;
END $$;
