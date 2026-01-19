DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'executor_jobs_dedupe_key_unique'
      AND conrelid = 'public.executor_jobs'::regclass
  ) THEN
    ALTER TABLE public.executor_jobs
      ADD CONSTRAINT executor_jobs_dedupe_key_unique UNIQUE (dedupe_key);
  END IF;
END;
$$;
