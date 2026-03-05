-- Harden internal runtime surfaces.
-- Goal:
-- 1) Internal runtime RPCs must not be callable by public roles.
-- 2) executor_jobs must be service-only at table policy/privilege level.

DO $$
DECLARE
  fn_signature text;
  fn_reg regprocedure;
BEGIN
  FOREACH fn_signature IN ARRAY ARRAY[
    'public.process_orchestrator_jobs()',
    'public.wake_execution_engine()',
    'public.runtime_tick()',
    'public.claim_orchestrator_jobs(integer,text)',
    'public.claim_initial_decision_jobs(integer,text)',
    'public.append_document_entity_event(uuid,jsonb,text)'
  ]
  LOOP
    fn_reg := to_regprocedure(fn_signature);

    IF fn_reg IS NULL THEN
      RAISE NOTICE 'Skipping runtime hardening: function % does not exist', fn_signature;
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

DO $$
BEGIN
  IF to_regclass('public.executor_jobs') IS NULL THEN
    RAISE NOTICE 'Skipping executor_jobs hardening: table does not exist';
    RETURN;
  END IF;

  ALTER TABLE public.executor_jobs ENABLE ROW LEVEL SECURITY;

  REVOKE ALL ON TABLE public.executor_jobs FROM PUBLIC;
  REVOKE ALL ON TABLE public.executor_jobs FROM anon;
  REVOKE ALL ON TABLE public.executor_jobs FROM authenticated;

  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.executor_jobs TO service_role;

  DROP POLICY IF EXISTS executor_jobs_service_role_only ON public.executor_jobs;
  CREATE POLICY executor_jobs_service_role_only
    ON public.executor_jobs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
END
$$;
