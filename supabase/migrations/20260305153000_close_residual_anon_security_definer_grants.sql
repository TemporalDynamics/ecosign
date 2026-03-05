-- Close residual SECURITY DEFINER mutator functions still executable by anon.
-- These functions are called from internal/service contexts and should not be
-- directly invocable by public clients.

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
        'insert_workflow_signer',
        'log_ecox_event',
        'upgrade_protection_level'
      ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO postgres', fn);
  END LOOP;
END $$;
