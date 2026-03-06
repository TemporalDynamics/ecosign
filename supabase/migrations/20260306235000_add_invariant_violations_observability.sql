-- Point 5: production observability for invariant violations.
-- Adds:
-- 1) internal runtime table public.invariant_violations
-- 2) deduping logger function public.log_invariant_violation(...)
-- 3) runtime anomaly scanner public.scan_runtime_invariant_violations(...)
-- 4) DB guard instrumentation for blocked projection writes.

CREATE TABLE IF NOT EXISTS public.invariant_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'error'
    CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_id UUID NULL,
  correlation_id TEXT NULL,
  role_name TEXT NULL,
  request_path TEXT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurrences INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ NULL,
  acknowledged_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invariant_violations_last_seen
  ON public.invariant_violations (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_invariant_violations_code_source
  ON public.invariant_violations (code, source);

CREATE INDEX IF NOT EXISTS idx_invariant_violations_open
  ON public.invariant_violations (acknowledged_at, severity, last_seen_at DESC);

ALTER TABLE public.invariant_violations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invariant_violations_service_role_policy ON public.invariant_violations;
CREATE POLICY invariant_violations_service_role_policy
ON public.invariant_violations
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON TABLE public.invariant_violations FROM PUBLIC;
REVOKE ALL ON TABLE public.invariant_violations FROM anon;
REVOKE ALL ON TABLE public.invariant_violations FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.invariant_violations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.invariant_violations TO postgres;

CREATE OR REPLACE FUNCTION public.log_invariant_violation(
  p_code TEXT,
  p_source TEXT,
  p_message TEXT,
  p_severity TEXT DEFAULT 'error',
  p_details JSONB DEFAULT '{}'::jsonb,
  p_entity_id UUID DEFAULT NULL,
  p_correlation_id TEXT DEFAULT NULL,
  p_role_name TEXT DEFAULT NULL,
  p_request_path TEXT DEFAULT NULL,
  p_dedupe_window_seconds INTEGER DEFAULT 900
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_dedupe_seconds INTEGER := GREATEST(COALESCE(p_dedupe_window_seconds, 900), 0);
  v_severity TEXT := lower(COALESCE(p_severity, 'error'));
BEGIN
  IF trim(COALESCE(p_code, '')) = '' THEN
    RAISE EXCEPTION 'p_code is required';
  END IF;

  IF trim(COALESCE(p_source, '')) = '' THEN
    RAISE EXCEPTION 'p_source is required';
  END IF;

  IF trim(COALESCE(p_message, '')) = '' THEN
    RAISE EXCEPTION 'p_message is required';
  END IF;

  IF v_severity NOT IN ('info', 'warning', 'error', 'critical') THEN
    v_severity := 'error';
  END IF;

  SELECT iv.id
    INTO v_id
  FROM public.invariant_violations iv
  WHERE iv.code = p_code
    AND iv.source = p_source
    AND iv.entity_id IS NOT DISTINCT FROM p_entity_id
    AND COALESCE(iv.request_path, '') = COALESCE(p_request_path, '')
    AND iv.last_seen_at >= now() - make_interval(secs => v_dedupe_seconds)
  ORDER BY iv.last_seen_at DESC
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.invariant_violations (
      code,
      severity,
      source,
      message,
      entity_id,
      correlation_id,
      role_name,
      request_path,
      details,
      first_seen_at,
      last_seen_at,
      occurrences,
      created_at,
      updated_at
    )
    VALUES (
      p_code,
      v_severity,
      p_source,
      p_message,
      p_entity_id,
      p_correlation_id,
      p_role_name,
      p_request_path,
      COALESCE(p_details, '{}'::jsonb),
      now(),
      now(),
      1,
      now(),
      now()
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.invariant_violations iv
    SET
      occurrences = iv.occurrences + 1,
      last_seen_at = now(),
      severity = CASE
        WHEN iv.severity = 'critical' THEN iv.severity
        WHEN v_severity = 'critical' THEN v_severity
        ELSE v_severity
      END,
      message = p_message,
      details = COALESCE(p_details, '{}'::jsonb),
      role_name = COALESCE(p_role_name, iv.role_name),
      correlation_id = COALESCE(p_correlation_id, iv.correlation_id),
      request_path = COALESCE(p_request_path, iv.request_path),
      updated_at = now()
    WHERE iv.id = v_id;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_invariant_violation(TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_invariant_violation(TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT, TEXT, TEXT, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.log_invariant_violation(TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT, TEXT, TEXT, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.log_invariant_violation(TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT, TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_invariant_violation(TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT, TEXT, TEXT, INTEGER) TO postgres;

CREATE OR REPLACE FUNCTION public.scan_runtime_invariant_violations(
  p_stuck_minutes INTEGER DEFAULT 30,
  p_attempt_threshold INTEGER DEFAULT 8,
  p_queue_stale_minutes INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stuck_count INTEGER := 0;
  v_high_attempt_count INTEGER := 0;
  v_stale_queued_count INTEGER := 0;
BEGIN
  SELECT COUNT(*)
    INTO v_stuck_count
  FROM public.executor_jobs ej
  WHERE ej.status = 'running'
    AND COALESCE(ej.heartbeat_at, ej.locked_at, ej.updated_at, ej.created_at)
      < now() - make_interval(mins => GREATEST(COALESCE(p_stuck_minutes, 30), 1));

  IF v_stuck_count > 0 THEN
    PERFORM public.log_invariant_violation(
      'executor.jobs.stuck',
      'db.scan_runtime_invariant_violations',
      'One or more running jobs appear stale (heartbeat/lock timeout).',
      'warning',
      jsonb_build_object(
        'count', v_stuck_count,
        'stuck_minutes_threshold', GREATEST(COALESCE(p_stuck_minutes, 30), 1)
      ),
      NULL,
      NULL,
      current_user,
      NULL,
      900
    );
  END IF;

  SELECT COUNT(*)
    INTO v_high_attempt_count
  FROM public.executor_jobs ej
  WHERE ej.status IN ('queued', 'retry_scheduled', 'running')
    AND ej.attempts >= GREATEST(COALESCE(p_attempt_threshold, 8), 1);

  IF v_high_attempt_count > 0 THEN
    PERFORM public.log_invariant_violation(
      'executor.jobs.high_attempts',
      'db.scan_runtime_invariant_violations',
      'One or more jobs exceeded retry-attempt threshold.',
      'warning',
      jsonb_build_object(
        'count', v_high_attempt_count,
        'attempt_threshold', GREATEST(COALESCE(p_attempt_threshold, 8), 1)
      ),
      NULL,
      NULL,
      current_user,
      NULL,
      900
    );
  END IF;

  SELECT COUNT(*)
    INTO v_stale_queued_count
  FROM public.executor_jobs ej
  WHERE ej.status = 'queued'
    AND ej.run_at < now() - make_interval(mins => GREATEST(COALESCE(p_queue_stale_minutes, 30), 1));

  IF v_stale_queued_count > 0 THEN
    PERFORM public.log_invariant_violation(
      'executor.jobs.queue_stale',
      'db.scan_runtime_invariant_violations',
      'Queued jobs exceeded stale-queue threshold.',
      'warning',
      jsonb_build_object(
        'count', v_stale_queued_count,
        'queue_stale_minutes_threshold', GREATEST(COALESCE(p_queue_stale_minutes, 30), 1)
      ),
      NULL,
      NULL,
      current_user,
      NULL,
      900
    );
  END IF;

  RETURN jsonb_build_object(
    'stuck_running_jobs', v_stuck_count,
    'high_attempt_jobs', v_high_attempt_count,
    'stale_queued_jobs', v_stale_queued_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.scan_runtime_invariant_violations(INTEGER, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scan_runtime_invariant_violations(INTEGER, INTEGER, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.scan_runtime_invariant_violations(INTEGER, INTEGER, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.scan_runtime_invariant_violations(INTEGER, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.scan_runtime_invariant_violations(INTEGER, INTEGER, INTEGER) TO postgres;

CREATE OR REPLACE VIEW public.invariant_violations_daily AS
SELECT
  date_trunc('day', iv.last_seen_at)::date AS day,
  iv.code,
  iv.source,
  iv.severity,
  SUM(iv.occurrences) AS total_occurrences,
  COUNT(*) AS unique_violations
FROM public.invariant_violations iv
GROUP BY 1, 2, 3, 4
ORDER BY 1 DESC, total_occurrences DESC;

REVOKE ALL ON TABLE public.invariant_violations_daily FROM PUBLIC;
REVOKE ALL ON TABLE public.invariant_violations_daily FROM anon;
REVOKE ALL ON TABLE public.invariant_violations_daily FROM authenticated;
GRANT SELECT ON TABLE public.invariant_violations_daily TO service_role;
GRANT SELECT ON TABLE public.invariant_violations_daily TO postgres;

COMMENT ON TABLE public.invariant_violations IS
  'Runtime observability ledger for canonical invariant violations (projection writes, internal auth misuse, executor anomalies).';

COMMENT ON FUNCTION public.scan_runtime_invariant_violations(INTEGER, INTEGER, INTEGER) IS
  'Scans executor runtime anomalies (stuck, high attempts, stale queue) and emits invariant_violations entries when thresholds are exceeded.';

CREATE OR REPLACE FUNCTION public.guard_workflow_signers_status_writes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ctx TEXT := lower(coalesce(current_setting('ecosign.workflow_signers_status_context', true), ''));
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      pg_trigger_depth() > 1
      OR v_ctx IN ('projection', 'maintenance')
    ) THEN
      PERFORM public.log_invariant_violation(
        'projection.workflow_signers_status.direct_write_blocked',
        'db.guard_workflow_signers_status_writes',
        'Direct write to projected signer status was blocked.',
        'critical',
        jsonb_build_object(
          'operation', TG_OP,
          'role', current_user,
          'context', coalesce(v_ctx, ''),
          'old_status', OLD.status,
          'new_status', NEW.status,
          'signer_id', NEW.id,
          'trigger_depth', pg_trigger_depth()
        ),
        NEW.id,
        NULL,
        current_user,
        NULL,
        900
      );

      RAISE EXCEPTION USING
        MESSAGE = 'workflow_signers.status is projected: direct writes are disabled',
        DETAIL = format('op=%s role=%s context=%s old=%s new=%s signer_id=%s', TG_OP, current_user, coalesce(v_ctx, ''), OLD.status, NEW.status, NEW.id),
        HINT = 'Append canonical signer/workflow events and let the signer projector materialize status.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_user_documents_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ctx text := lower(coalesce(current_setting('ecosign.user_documents_write_context', true), ''));
  v_allowed boolean := false;
BEGIN
  v_allowed := (
    pg_trigger_depth() > 1
    OR v_ctx IN ('projection', 'legacy', 'maintenance')
  );

  IF NOT v_allowed THEN
    PERFORM public.log_invariant_violation(
      'projection.user_documents.direct_write_blocked',
      'db.guard_user_documents_writes',
      'Direct write to frozen user_documents projection was blocked.',
      'critical',
      jsonb_build_object(
        'operation', TG_OP,
        'role', current_user,
        'context', coalesce(v_ctx, ''),
        'trigger_depth', pg_trigger_depth()
      ),
      COALESCE(NEW.id, OLD.id),
      NULL,
      current_user,
      NULL,
      900
    );

    RAISE EXCEPTION USING
      MESSAGE = 'user_documents is frozen: direct writes are disabled',
      DETAIL = format(
        'op=%s role=%s trigger_depth=%s context=%s',
        TG_OP,
        current_user,
        pg_trigger_depth(),
        coalesce(v_ctx, '')
      ),
      HINT = 'Write canonical events into document_entities and let projection handle legacy views.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
