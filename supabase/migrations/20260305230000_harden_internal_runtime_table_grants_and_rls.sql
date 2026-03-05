-- Final hardening: internal runtime tables must be service-role only.
-- This closes residual anon/auth grants and enforces RLS on internal pipeline state.

DO $$
DECLARE
  tbl text;
  pol record;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'domain_outbox',
    'executor_job_runs',
    'executor_jobs',
    'welcome_email_queue',
    'system_workers',
    'executor_decision_logs',
    'shadow_decision_logs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', tbl);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', tbl);

    EXECUTE format(
      'GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I TO service_role',
      tbl
    );

    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tbl || '_service_role_only',
      tbl
    );
  END LOOP;
END $$;

