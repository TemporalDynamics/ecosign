-- Migration: Add update_job_heartbeat() function
-- Purpose: Allow workers to update heartbeat during long-running jobs
-- Part of: TTL Reclaim + Heartbeat (Fase 1.2 - Optional Fase 2)
-- Note: Deploy this AFTER validating core reclaim functionality

CREATE OR REPLACE FUNCTION public.update_job_heartbeat(
  p_job_id uuid,
  p_worker_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated boolean := false;
BEGIN
  -- Only allow the worker that owns the lock to update heartbeat
  UPDATE public.executor_jobs
  SET heartbeat_at = now()
  WHERE id = p_job_id
    AND locked_by = p_worker_id
    AND status IN ('running', 'processing');

  v_updated := FOUND;

  IF NOT v_updated THEN
    RAISE WARNING 'update_job_heartbeat: Failed for job_id=%, worker_id=% (not owner or job not running)',
      p_job_id, p_worker_id;
  END IF;

  RETURN v_updated;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'update_job_heartbeat error: % %', SQLERRM, SQLSTATE;
  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.update_job_heartbeat(uuid, text) IS
  'Updates heartbeat_at for a running job. Only the worker that owns the lock (locked_by) can update. Returns true if successful.';
