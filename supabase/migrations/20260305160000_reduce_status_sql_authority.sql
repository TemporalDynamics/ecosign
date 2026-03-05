-- Reduce implicit status authority in legacy SQL helpers.
-- Contract:
-- - signature_workflows.status is projected from workflow_events.
-- - SQL helpers may advance signer queues, but must not set workflow status directly.

CREATE OR REPLACE FUNCTION public.advance_workflow(p_workflow_id UUID)
RETURNS VOID AS $$
DECLARE
  v_next_signer_id UUID;
BEGIN
  v_next_signer_id := public.get_next_signer(p_workflow_id);

  IF v_next_signer_id IS NOT NULL THEN
    UPDATE public.workflow_signers
    SET status = 'ready_to_sign',
        updated_at = now()
    WHERE id = v_next_signer_id;
  END IF;
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

  -- Keep current_version as projection metadata only.
  -- `signature_workflows.status` is projected from workflow_events.
  UPDATE public.signature_workflows
  SET current_version = v_new_version,
      updated_at = now()
  WHERE id = p_workflow_id;

  UPDATE public.workflow_signers
  SET status = 'invited',
      updated_at = now()
  WHERE workflow_id = p_workflow_id
    AND status IN ('ready_to_sign', 'invited', 'accessed', 'verified');

  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.advance_workflow(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.advance_workflow(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.advance_workflow(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.advance_workflow(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.advance_workflow(UUID) TO postgres;

REVOKE ALL ON FUNCTION public.create_workflow_version(UUID, TEXT, TEXT, TEXT, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_workflow_version(UUID, TEXT, TEXT, TEXT, UUID, JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.create_workflow_version(UUID, TEXT, TEXT, TEXT, UUID, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_workflow_version(UUID, TEXT, TEXT, TEXT, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_workflow_version(UUID, TEXT, TEXT, TEXT, UUID, JSONB) TO postgres;
