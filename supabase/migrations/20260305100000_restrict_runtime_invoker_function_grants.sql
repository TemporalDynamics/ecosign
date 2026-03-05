-- Tighten execute permissions for internal cron/runtime invoker functions.
-- These functions trigger worker execution and must not be callable by public roles.

DO $$
DECLARE
  fn_signature text;
  fn_reg regprocedure;
BEGIN
  FOREACH fn_signature IN ARRAY ARRAY[
    'public.process_orchestrator_jobs()',
    'public.wake_execution_engine()',
    'public.runtime_tick()',
    'public.run_process_polygon_anchors()',
    'public.run_process_bitcoin_anchors()'
  ]
  LOOP
    fn_reg := to_regprocedure(fn_signature);

    IF fn_reg IS NULL THEN
      RAISE NOTICE 'Skipping grant hardening: function % does not exist', fn_signature;
      CONTINUE;
    END IF;

    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn_reg);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn_reg);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn_reg);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO postgres', fn_reg);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn_reg);
  END LOOP;
END
$$;
