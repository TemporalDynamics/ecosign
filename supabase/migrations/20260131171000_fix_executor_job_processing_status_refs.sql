-- Migration: Remove phantom executor_jobs.status='processing' references
-- Date: 2026-01-31
-- Purpose:
-- The canonical executor_jobs status set does not include 'processing' (only 'running' for in-flight).
-- Keep queries/indexes aligned with the real CHECK constraint to avoid confusing diagnostics.

-- 1) Rebuild reclaim index with the real in-flight status
DROP INDEX IF EXISTS public.executor_jobs_reclaim_idx;

CREATE INDEX IF NOT EXISTS executor_jobs_reclaim_idx
  ON public.executor_jobs (status, type, locked_at, heartbeat_at)
  WHERE status = 'running';

COMMENT ON INDEX public.executor_jobs_reclaim_idx IS
  'Optimizes reclaim_stale_jobs() queries. Partial index on running jobs only.';

-- 2) Update reclaim_stale_jobs() to use only status=running
CREATE OR REPLACE FUNCTION public.reclaim_stale_jobs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reclaimed_count int := 0;
  v_dead_count int := 0;
  v_job_type text;
  v_ttl_minutes int;
  v_ttl_interval interval;
  v_default_max_attempts int := 10;
  v_reclaimed_jobs jsonb := '[]'::jsonb;
  v_dead_jobs jsonb := '[]'::jsonb;
  v_job_record record;
  v_stale_cutoff timestamptz;
  v_job_max_attempts int;
  v_next_attempts int;
BEGIN
  FOR v_job_type, v_ttl_minutes IN
    SELECT * FROM (VALUES
      ('protect_document_v2', 5),
      ('document.protected', 5),
      ('run_tsa', 60),
      ('submit_anchor_polygon', 120),
      ('submit_anchor_bitcoin', 120),
      ('build_artifact', 15)
    ) AS ttls(job_type, ttl_min)
  LOOP
    v_ttl_interval := (v_ttl_minutes || ' minutes')::interval;
    v_stale_cutoff := now() - v_ttl_interval;

    FOR v_job_record IN
      SELECT id, dedupe_key, attempts, max_attempts, locked_at, heartbeat_at, last_error
      FROM public.executor_jobs
      WHERE status = 'running'
        AND type = v_job_type
        AND locked_at < v_stale_cutoff
        AND (heartbeat_at IS NULL OR heartbeat_at < v_stale_cutoff)
      FOR UPDATE SKIP LOCKED
    LOOP
      v_job_max_attempts := COALESCE(v_job_record.max_attempts, v_default_max_attempts);
      v_next_attempts := COALESCE(v_job_record.attempts, 0) + 1;

      IF v_next_attempts >= v_job_max_attempts THEN
        UPDATE public.executor_jobs
        SET
          status = 'dead',
          locked_at = NULL,
          locked_by = NULL,
          attempts = v_next_attempts,
          last_error = 'RECLAIMED_TTL: Exceeded TTL (' || v_ttl_minutes || ' min) at attempt ' || COALESCE(v_job_record.attempts, 0) || '. Max attempts reached (' || v_job_max_attempts || '). ' || COALESCE(v_job_record.last_error, ''),
          updated_at = now()
        WHERE id = v_job_record.id;

        v_dead_count := v_dead_count + 1;
        v_dead_jobs := v_dead_jobs || jsonb_build_object(
          'id', v_job_record.id,
          'dedupe_key', v_job_record.dedupe_key,
          'type', v_job_type,
          'attempts', v_job_record.attempts,
          'locked_at', v_job_record.locked_at,
          'heartbeat_at', v_job_record.heartbeat_at
        );
      ELSE
        UPDATE public.executor_jobs
        SET
          status = 'queued',
          locked_at = NULL,
          locked_by = NULL,
          attempts = v_next_attempts,
          last_error = 'RECLAIMED_TTL: Exceeded TTL (' || v_ttl_minutes || ' min) at attempt ' || COALESCE(v_job_record.attempts, 0) || '. ' || COALESCE(v_job_record.last_error, ''),
          updated_at = now()
        WHERE id = v_job_record.id;

        v_reclaimed_count := v_reclaimed_count + 1;
        v_reclaimed_jobs := v_reclaimed_jobs || jsonb_build_object(
          'id', v_job_record.id,
          'dedupe_key', v_job_record.dedupe_key,
          'type', v_job_type,
          'attempts', v_job_record.attempts,
          'locked_at', v_job_record.locked_at,
          'heartbeat_at', v_job_record.heartbeat_at
        );
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'reclaimed_count', v_reclaimed_count,
    'dead_count', v_dead_count,
    'timestamp', now(),
    'reclaimed_jobs', v_reclaimed_jobs,
    'dead_jobs', v_dead_jobs
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'reclaim_stale_jobs() error: % %', SQLERRM, SQLSTATE;
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'sqlstate', SQLSTATE,
    'reclaimed_count', v_reclaimed_count,
    'dead_count', v_dead_count,
    'timestamp', now()
  );
END;
$$;

COMMENT ON FUNCTION public.reclaim_stale_jobs() IS
  'Reclaims stale running executor jobs that exceeded their TTL. Canonical in-flight status is running (no processing).';

