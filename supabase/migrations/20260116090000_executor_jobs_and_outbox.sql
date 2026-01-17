-- Executor jobs table (queue + locking + idempotency)
CREATE TABLE IF NOT EXISTS public.executor_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  entity_type text,
  entity_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 10,
  run_at timestamptz NOT NULL DEFAULT now(),
  dedupe_key text,
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT executor_jobs_status_check
    CHECK (status IN ('queued','running','succeeded','failed','retry_scheduled','dead'))
);

CREATE UNIQUE INDEX IF NOT EXISTS executor_jobs_dedupe_key_uniq
  ON public.executor_jobs (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS executor_jobs_status_run_at_idx
  ON public.executor_jobs (status, run_at);

CREATE INDEX IF NOT EXISTS executor_jobs_locked_at_idx
  ON public.executor_jobs (locked_at);

CREATE INDEX IF NOT EXISTS executor_jobs_entity_idx
  ON public.executor_jobs (entity_type, entity_id);

CREATE TRIGGER executor_jobs_updated_at
  BEFORE UPDATE ON public.executor_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Domain outbox (optional, recommended)
CREATE TABLE IF NOT EXISTS public.domain_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type text NOT NULL,
  aggregate_id uuid,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  dedupe_key text,
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT domain_outbox_status_check
    CHECK (status IN ('pending','dispatched','failed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS domain_outbox_dedupe_key_uniq
  ON public.domain_outbox (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS domain_outbox_status_created_at_idx
  ON public.domain_outbox (status, created_at);

CREATE INDEX IF NOT EXISTS domain_outbox_locked_at_idx
  ON public.domain_outbox (locked_at);

CREATE TRIGGER domain_outbox_updated_at
  BEFORE UPDATE ON public.domain_outbox
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Claim jobs with SKIP LOCKED for safe parallel workers
CREATE OR REPLACE FUNCTION public.claim_executor_jobs(
  p_limit integer,
  p_worker_id text
) RETURNS SETOF public.executor_jobs
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT id
    FROM public.executor_jobs
    WHERE status IN ('queued','retry_scheduled')
      AND run_at <= now()
      AND locked_at IS NULL
    ORDER BY run_at ASC, created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.executor_jobs j
  SET status = 'running',
      locked_at = now(),
      locked_by = p_worker_id,
      updated_at = now()
  FROM candidate
  WHERE j.id = candidate.id
  RETURNING j.*;
END;
$$;
