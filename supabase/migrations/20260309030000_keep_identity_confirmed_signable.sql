-- signer.identity_confirmed is an in-flow verification step, not an authority state transition.
-- When a signer is already ready_to_sign, OTP/identity confirmation should not demote them
-- back to 'verified'. Same pattern as signer.accessed fix (migration 20260306002000).

CREATE OR REPLACE FUNCTION public.project_workflow_signer_status(
  p_workflow_id UUID,
  p_signer_id UUID DEFAULT NULL
)
RETURNS TABLE (
  signer_id UUID,
  projected_status TEXT,
  changed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workflow_cancelled BOOLEAN;
  v_target_status TEXT;
  v_latest_event_type TEXT;
  v_latest_event_at TIMESTAMPTZ;
  r RECORD;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.workflow_events we
    WHERE we.workflow_id = p_workflow_id
      AND we.event_type = 'workflow.cancelled'
  ) INTO v_workflow_cancelled;

  FOR r IN
    SELECT ws.id, ws.status, ws.signed_at, ws.first_accessed_at
    FROM public.workflow_signers ws
    WHERE ws.workflow_id = p_workflow_id
      AND (p_signer_id IS NULL OR ws.id = p_signer_id)
    FOR UPDATE
  LOOP
    v_target_status := r.status;
    v_latest_event_type := NULL;
    v_latest_event_at := NULL;

    SELECT we.event_type, we.created_at
      INTO v_latest_event_type, v_latest_event_at
    FROM public.workflow_events we
    WHERE we.workflow_id = p_workflow_id
      AND we.signer_id = r.id
      AND we.event_type IN (
        'signer.invited',
        'signer.accessed',
        'signer.identity_confirmed',
        'signer.ready_to_sign',
        'signer.signed',
        'signer.cancelled',
        'signer.rejected',
        'signer.expired'
      )
    ORDER BY we.created_at DESC, we.id DESC
    LIMIT 1;

    IF v_latest_event_type IS NOT NULL THEN
      v_target_status := CASE v_latest_event_type
        WHEN 'signer.invited' THEN 'invited'
        -- signer.accessed should not demote a ready signer out of signing state.
        WHEN 'signer.accessed' THEN 'ready_to_sign'
        -- signer.identity_confirmed is an in-flow step (OTP/identity check).
        -- It must not demote a signer who is already ready_to_sign.
        WHEN 'signer.identity_confirmed' THEN 'ready_to_sign'
        WHEN 'signer.ready_to_sign' THEN 'ready_to_sign'
        WHEN 'signer.signed' THEN 'signed'
        WHEN 'signer.cancelled' THEN 'cancelled'
        WHEN 'signer.rejected' THEN 'rejected'
        WHEN 'signer.expired' THEN 'expired'
        ELSE r.status
      END;
    END IF;

    IF v_workflow_cancelled
       AND v_target_status NOT IN ('signed', 'rejected', 'cancelled', 'expired') THEN
      v_target_status := 'cancelled';
    END IF;

    IF v_target_status <> r.status
       OR (v_target_status = 'signed' AND r.signed_at IS NULL)
       OR (v_latest_event_type = 'signer.accessed' AND r.first_accessed_at IS NULL)
       OR (v_target_status = 'invited' AND r.signed_at IS NOT NULL)
    THEN
      PERFORM set_config('ecosign.workflow_signers_status_context', 'projection', true);

      UPDATE public.workflow_signers ws
      SET
        status = v_target_status,
        signed_at = CASE
          WHEN v_target_status = 'invited' THEN NULL
          WHEN v_target_status = 'signed' THEN COALESCE(ws.signed_at, v_latest_event_at, NOW())
          ELSE ws.signed_at
        END,
        first_accessed_at = CASE
          WHEN v_latest_event_type = 'signer.accessed' THEN COALESCE(ws.first_accessed_at, v_latest_event_at, NOW())
          ELSE ws.first_accessed_at
        END,
        updated_at = NOW()
      WHERE ws.id = r.id;

      RETURN QUERY SELECT r.id, v_target_status, TRUE;
    ELSE
      RETURN QUERY SELECT r.id, v_target_status, FALSE;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.project_workflow_signer_status(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.project_workflow_signer_status(UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.project_workflow_signer_status(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.project_workflow_signer_status(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.project_workflow_signer_status(UUID, UUID) TO postgres;

-- Backfill: re-project all workflows so signers currently stuck in 'verified'
-- due to identity_confirmed after ready_to_sign are promoted back to signable state.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT workflow_id
    FROM public.workflow_signers
    WHERE status = 'verified'
  LOOP
    PERFORM public.project_workflow_signer_status(r.workflow_id, NULL);
  END LOOP;
END;
$$;
