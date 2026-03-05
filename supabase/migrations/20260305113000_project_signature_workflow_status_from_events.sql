-- Canonical workflow status projection:
-- `signature_workflows.status` is a projection derived from `workflow_events`.

CREATE OR REPLACE FUNCTION public.project_signature_workflow_status(p_workflow_id UUID)
RETURNS TABLE (
  workflow_id UUID,
  projected_status TEXT,
  changed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status TEXT;
  v_current_completed_at TIMESTAMPTZ;
  v_target_status TEXT;
  v_completed_event_at TIMESTAMPTZ;
  v_has_cancelled BOOLEAN;
  v_has_rejected BOOLEAN;
  v_has_completed BOOLEAN;
  v_has_active_signal BOOLEAN;
BEGIN
  SELECT status, completed_at
    INTO v_current_status, v_current_completed_at
  FROM public.signature_workflows
  WHERE id = p_workflow_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_target_status := v_current_status;

  SELECT
    EXISTS (
      SELECT 1
      FROM public.workflow_events we
      WHERE we.workflow_id = p_workflow_id
        AND we.event_type = 'workflow.cancelled'
    ),
    EXISTS (
      SELECT 1
      FROM public.workflow_events we
      WHERE we.workflow_id = p_workflow_id
        AND we.event_type = 'signer.rejected'
    ),
    EXISTS (
      SELECT 1
      FROM public.workflow_events we
      WHERE we.workflow_id = p_workflow_id
        AND we.event_type = 'workflow.completed'
    ),
    EXISTS (
      SELECT 1
      FROM public.workflow_events we
      WHERE we.workflow_id = p_workflow_id
        AND we.event_type IN (
          'workflow.activated',
          'signer.ready_to_sign',
          'signer.signed',
          'signer.identity_confirmed',
          'document.change_requested',
          'document.change_resolved',
          'otp.verified',
          'signature.applied'
        )
    )
  INTO
    v_has_cancelled,
    v_has_rejected,
    v_has_completed,
    v_has_active_signal;

  SELECT MAX(created_at)
    INTO v_completed_event_at
  FROM public.workflow_events we
  WHERE we.workflow_id = p_workflow_id
    AND we.event_type = 'workflow.completed';

  -- Never regress terminal projections.
  IF v_current_status IN ('cancelled', 'rejected', 'archived') THEN
    RETURN QUERY SELECT p_workflow_id, v_current_status, FALSE;
    RETURN;
  END IF;

  IF v_current_status <> 'completed' THEN
    IF v_has_cancelled THEN
      v_target_status := 'cancelled';
    ELSIF v_has_rejected THEN
      v_target_status := 'rejected';
    ELSIF v_has_completed THEN
      v_target_status := 'completed';
    ELSIF v_current_status IN ('draft', 'ready') AND v_has_active_signal THEN
      v_target_status := 'active';
    END IF;
  END IF;

  IF v_target_status <> v_current_status THEN
    UPDATE public.signature_workflows
    SET
      status = v_target_status,
      updated_at = NOW(),
      completed_at = CASE
        WHEN v_target_status = 'completed' THEN COALESCE(completed_at, v_completed_event_at, NOW())
        ELSE completed_at
      END
    WHERE id = p_workflow_id;

    RETURN QUERY SELECT p_workflow_id, v_target_status, TRUE;
    RETURN;
  END IF;

  IF v_target_status = 'completed' AND v_current_completed_at IS NULL THEN
    UPDATE public.signature_workflows
    SET completed_at = COALESCE(v_completed_event_at, NOW()),
        updated_at = NOW()
    WHERE id = p_workflow_id;

    RETURN QUERY SELECT p_workflow_id, v_target_status, TRUE;
    RETURN;
  END IF;

  RETURN QUERY SELECT p_workflow_id, v_target_status, FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.project_signature_workflow_status(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.project_signature_workflow_status(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.project_signature_workflow_status(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.project_signature_workflow_status(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.project_signature_workflow_status(UUID) TO postgres;

CREATE OR REPLACE FUNCTION public.trg_project_signature_workflow_status_from_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.project_signature_workflow_status(NEW.workflow_id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_project_signature_workflow_status_from_event() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_project_signature_workflow_status_from_event() FROM anon;
REVOKE ALL ON FUNCTION public.trg_project_signature_workflow_status_from_event() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.trg_project_signature_workflow_status_from_event() TO service_role;
GRANT EXECUTE ON FUNCTION public.trg_project_signature_workflow_status_from_event() TO postgres;

DROP TRIGGER IF EXISTS trg_project_signature_workflow_status_from_event ON public.workflow_events;
CREATE TRIGGER trg_project_signature_workflow_status_from_event
AFTER INSERT ON public.workflow_events
FOR EACH ROW
EXECUTE FUNCTION public.trg_project_signature_workflow_status_from_event();

DO $$
DECLARE
  v_workflow_id UUID;
BEGIN
  FOR v_workflow_id IN
    SELECT id FROM public.signature_workflows
  LOOP
    PERFORM public.project_signature_workflow_status(v_workflow_id);
  END LOOP;
END;
$$;
