-- Minimal observability for executor runs
CREATE TABLE IF NOT EXISTS public.executor_job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.executor_jobs(id) ON DELETE CASCADE,
  status text NOT NULL,
  attempt integer NOT NULL,
  worker_id text,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  duration_ms integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS executor_job_runs_job_id_idx
  ON public.executor_job_runs (job_id);

CREATE INDEX IF NOT EXISTS executor_job_runs_status_idx
  ON public.executor_job_runs (status);

CREATE INDEX IF NOT EXISTS executor_job_runs_started_at_idx
  ON public.executor_job_runs (started_at);
