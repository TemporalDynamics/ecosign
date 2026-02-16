-- Runtime cron inventory reader (read-only) for canonical convergence checks
-- Purpose: provide least-privilege visibility into cron.job without direct table grants

CREATE OR REPLACE FUNCTION public.get_cron_status(job_pattern text DEFAULT '%')
RETURNS TABLE(
  jobname text,
  schedule text,
  active boolean,
  command text
)
SECURITY DEFINER
SET search_path = public, cron
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.jobname::text,
    j.schedule::text,
    j.active,
    j.command::text
  FROM cron.job j
  WHERE j.jobname ILIKE job_pattern
  ORDER BY j.jobname;
END;
$$;

REVOKE ALL ON FUNCTION public.get_cron_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cron_status(text) TO service_role;
