-- Canonical signer-status projection:
-- workflow_signers.status is derived from workflow_events.

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
        WHEN 'signer.accessed' THEN 'accessed'
        WHEN 'signer.identity_confirmed' THEN 'verified'
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
       OR (v_target_status = 'accessed' AND r.first_accessed_at IS NULL)
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
          WHEN v_target_status = 'accessed' THEN COALESCE(ws.first_accessed_at, v_latest_event_at, NOW())
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

CREATE OR REPLACE FUNCTION public.trg_project_workflow_signer_status_from_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.signer_id IS NOT NULL THEN
    PERFORM public.project_workflow_signer_status(NEW.workflow_id, NEW.signer_id);
  END IF;

  IF NEW.event_type = 'workflow.cancelled' THEN
    PERFORM public.project_workflow_signer_status(NEW.workflow_id, NULL);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_project_workflow_signer_status_from_event() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_project_workflow_signer_status_from_event() FROM anon;
REVOKE ALL ON FUNCTION public.trg_project_workflow_signer_status_from_event() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.trg_project_workflow_signer_status_from_event() TO service_role;
GRANT EXECUTE ON FUNCTION public.trg_project_workflow_signer_status_from_event() TO postgres;

DROP TRIGGER IF EXISTS trg_project_workflow_signer_status_from_event ON public.workflow_events;
CREATE TRIGGER trg_project_workflow_signer_status_from_event
AFTER INSERT ON public.workflow_events
FOR EACH ROW
EXECUTE FUNCTION public.trg_project_workflow_signer_status_from_event();

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
      RAISE EXCEPTION USING
        MESSAGE = 'workflow_signers.status is projected: direct writes are disabled',
        DETAIL = format('op=%s role=%s context=%s old=%s new=%s signer_id=%s', TG_OP, current_user, coalesce(v_ctx, ''), OLD.status, NEW.status, NEW.id),
        HINT = 'Append canonical signer/workflow events and let the signer projector materialize status.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_workflow_signers_status_writes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_workflow_signers_status_writes() FROM anon;
REVOKE ALL ON FUNCTION public.guard_workflow_signers_status_writes() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.guard_workflow_signers_status_writes() TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_workflow_signers_status_writes() TO postgres;

DROP TRIGGER IF EXISTS trg_guard_workflow_signers_status_writes ON public.workflow_signers;
CREATE TRIGGER trg_guard_workflow_signers_status_writes
BEFORE UPDATE OF status ON public.workflow_signers
FOR EACH ROW
EXECUTE FUNCTION public.guard_workflow_signers_status_writes();

-- Reduce SQL helper authority: emit canonical events instead of mutating signer status.
CREATE OR REPLACE FUNCTION public.advance_workflow(p_workflow_id UUID)
RETURNS VOID AS $$
DECLARE
  v_next_signer_id UUID;
  v_current_status TEXT;
BEGIN
  v_next_signer_id := public.get_next_signer(p_workflow_id);

  IF v_next_signer_id IS NULL THEN
    RETURN;
  END IF;

  SELECT status
    INTO v_current_status
  FROM public.workflow_signers
  WHERE id = v_next_signer_id;

  IF v_current_status IN ('signed', 'cancelled', 'rejected', 'expired', 'ready_to_sign') THEN
    RETURN;
  END IF;

  PERFORM public.append_event_to_workflow_events(
    'signer.ready_to_sign',
    p_workflow_id,
    v_next_signer_id,
    jsonb_build_object('source', 'advance_workflow'),
    NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.create_workflow_version(
  p_workflow_id UUID,
  p_document_url TEXT,
  p_document_hash TEXT,
  p_change_reason TEXT,
  p_requested_by UUID,
  p_modification_notes JSONB
)
RETURNS UUID AS $$
DECLARE
  v_new_version INTEGER;
  v_version_id UUID;
  v_signer RECORD;
BEGIN
  UPDATE public.workflow_versions
  SET status = 'superseded'
  WHERE workflow_id = p_workflow_id
    AND status = 'active';

  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_new_version
  FROM public.workflow_versions
  WHERE workflow_id = p_workflow_id;

  INSERT INTO public.workflow_versions (
    workflow_id,
    version_number,
    document_url,
    document_hash,
    change_reason,
    requested_by,
    modification_notes,
    status
  ) VALUES (
    p_workflow_id,
    v_new_version,
    p_document_url,
    p_document_hash,
    p_change_reason,
    p_requested_by,
    p_modification_notes,
    'active'
  ) RETURNING id INTO v_version_id;

  UPDATE public.signature_workflows
  SET current_version = v_new_version,
      updated_at = now()
  WHERE id = p_workflow_id;

  FOR v_signer IN
    SELECT id, email, signing_order
    FROM public.workflow_signers
    WHERE workflow_id = p_workflow_id
      AND status IN ('ready_to_sign', 'invited', 'accessed', 'verified')
  LOOP
    PERFORM public.append_event_to_workflow_events(
      'signer.invited',
      p_workflow_id,
      v_signer.id,
      jsonb_build_object(
        'email', v_signer.email,
        'signing_order', v_signer.signing_order,
        'reason', 'version_reset'
      ),
      p_requested_by
    );
  END LOOP;

  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
DECLARE
  v_workflow_id UUID;
BEGIN
  FOR v_workflow_id IN
    SELECT id FROM public.signature_workflows
  LOOP
    PERFORM public.project_workflow_signer_status(v_workflow_id, NULL);
  END LOOP;
END;
$$;
