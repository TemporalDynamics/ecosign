-- Runtime cron status reader for canonical convergence evidence
-- Date: 2026-02-16
-- Notes:
-- - Uses SECURITY DEFINER to avoid direct grants on cron.job.
-- - Handles environments where cron.job may not expose last_run.

CREATE OR REPLACE FUNCTION public.get_cron_runtime_status()
RETURNS TABLE(
  jobname text,
  active boolean,
  schedule text,
  last_run timestamptz
)
SECURITY DEFINER
SET search_path = public, cron
LANGUAGE plpgsql
AS $$
DECLARE
  has_last_run boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'cron'
      AND table_name = 'job'
      AND column_name = 'last_run'
  ) INTO has_last_run;

  IF has_last_run THEN
    RETURN QUERY EXECUTE $sql$
      SELECT
        j.jobname::text,
        j.active,
        j.schedule::text,
        j.last_run
      FROM cron.job j
      ORDER BY j.jobname
    $sql$;
  ELSE
    RETURN QUERY
    SELECT
      j.jobname::text,
      j.active,
      j.schedule::text,
      NULL::timestamptz
    FROM cron.job j
    ORDER BY j.jobname;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_cron_runtime_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cron_runtime_status() TO service_role;

COMMENT ON FUNCTION public.get_cron_runtime_status() IS
  'Read-only runtime status of cron jobs; includes last_run when available.';
