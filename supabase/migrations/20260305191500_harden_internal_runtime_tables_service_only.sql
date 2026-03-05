-- Harden internal runtime tables: service-role-only access.
-- Goal: prevent anon/authenticated reads/writes on internal pipelines.

ALTER TABLE IF EXISTS public.domain_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.executor_job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.welcome_email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.executor_jobs ENABLE ROW LEVEL SECURITY;

-- Remove any broad grants from user-facing roles.
REVOKE INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.domain_outbox FROM anon, authenticated;
REVOKE INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.executor_job_runs FROM anon, authenticated;
REVOKE INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.welcome_email_queue FROM anon, authenticated;
REVOKE INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.executor_jobs FROM anon, authenticated;

-- Keep explicit service_role grants.
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.domain_outbox TO service_role;
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.executor_job_runs TO service_role;
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.welcome_email_queue TO service_role;
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.executor_jobs TO service_role;

-- Replace policies with strict service-role-only policies.
DROP POLICY IF EXISTS domain_outbox_service_role_only ON public.domain_outbox;
DROP POLICY IF EXISTS executor_job_runs_service_role_only ON public.executor_job_runs;
DROP POLICY IF EXISTS welcome_email_queue_service_role_only ON public.welcome_email_queue;
DROP POLICY IF EXISTS "Users can view own welcome email status" ON public.welcome_email_queue;

CREATE POLICY domain_outbox_service_role_only
  ON public.domain_outbox
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY executor_job_runs_service_role_only
  ON public.executor_job_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY welcome_email_queue_service_role_only
  ON public.welcome_email_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
