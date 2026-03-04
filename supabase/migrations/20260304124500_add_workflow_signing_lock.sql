-- Add workflow-level signing lock for parallel signing

ALTER TABLE public.signature_workflows
  ADD COLUMN IF NOT EXISTS signing_lock_id uuid,
  ADD COLUMN IF NOT EXISTS signing_lock_at timestamptz;

CREATE OR REPLACE FUNCTION public.claim_signer_for_signing(
  p_signer_id uuid,
  p_lock_id uuid,
  p_lock_ttl_seconds integer DEFAULT 300
)
RETURNS TABLE (
  signer_id uuid,
  workflow_id uuid,
  status text,
  signing_lock_id uuid,
  signing_lock_at timestamptz,
  claimed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_workflow_id uuid;
  v_status text;
  v_first_ready uuid;
  v_require_sequential boolean := true;
  v_workflow_lock_claimed boolean := true;
BEGIN
  -- Lock signer row for consistent status + workflow lookup
  SELECT ws.workflow_id, ws.status
  INTO v_workflow_id, v_status
  FROM public.workflow_signers ws
  WHERE ws.id = p_signer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Load workflow mode and lock row for safe updates
  SELECT sw.require_sequential
  INTO v_require_sequential
  FROM public.signature_workflows sw
  WHERE sw.id = v_workflow_id
  FOR UPDATE;

  -- Only ready_to_sign can be claimed
  IF v_status IS DISTINCT FROM 'ready_to_sign' THEN
    RETURN QUERY
    SELECT ws.id, ws.workflow_id, ws.status, ws.signing_lock_id, ws.signing_lock_at, false
    FROM public.workflow_signers ws
    WHERE ws.id = p_signer_id;
    RETURN;
  END IF;

  IF v_require_sequential IS DISTINCT FROM false THEN
    -- Enforce sequential order: only earliest ready_to_sign may proceed
    SELECT ws.id
    INTO v_first_ready
    FROM public.workflow_signers ws
    WHERE ws.workflow_id = v_workflow_id
      AND ws.status = 'ready_to_sign'
    ORDER BY ws.signing_order ASC
    LIMIT 1
    FOR UPDATE;

    IF v_first_ready IS DISTINCT FROM p_signer_id THEN
      RETURN QUERY
      SELECT ws.id, ws.workflow_id, ws.status, ws.signing_lock_id, ws.signing_lock_at, false
      FROM public.workflow_signers ws
      WHERE ws.id = p_signer_id;
      RETURN;
    END IF;
  ELSE
    -- Parallel flow: claim workflow-level lock to prevent concurrent PDF writes
    UPDATE public.signature_workflows
    SET signing_lock_id = p_lock_id,
        signing_lock_at = v_now
    WHERE id = v_workflow_id
      AND (
        signing_lock_id IS NULL
        OR signing_lock_at < v_now - make_interval(secs => p_lock_ttl_seconds)
      )
    RETURNING true
    INTO v_workflow_lock_claimed;

    IF NOT FOUND OR v_workflow_lock_claimed IS NOT TRUE THEN
      RETURN QUERY
      SELECT ws.id, ws.workflow_id, ws.status, ws.signing_lock_id, ws.signing_lock_at, false
      FROM public.workflow_signers ws
      WHERE ws.id = p_signer_id;
      RETURN;
    END IF;
  END IF;

  -- Try to claim signer lock (with TTL)
  UPDATE public.workflow_signers
  SET signing_lock_id = p_lock_id,
      signing_lock_at = v_now
  WHERE id = p_signer_id
    AND status = 'ready_to_sign'
    AND (
      signing_lock_id IS NULL
      OR signing_lock_at < v_now - make_interval(secs => p_lock_ttl_seconds)
    )
  RETURNING id, workflow_id, status, signing_lock_id, signing_lock_at, true
  INTO signer_id, workflow_id, status, signing_lock_id, signing_lock_at, claimed;

  IF FOUND THEN
    RETURN NEXT;
  END IF;

  -- If signer lock failed, release workflow lock for parallel flow
  IF v_require_sequential IS DISTINCT FROM true THEN
    UPDATE public.signature_workflows
    SET signing_lock_id = NULL,
        signing_lock_at = NULL
    WHERE id = v_workflow_id
      AND signing_lock_id = p_lock_id;
  END IF;

  RETURN QUERY
  SELECT ws.id, ws.workflow_id, ws.status, ws.signing_lock_id, ws.signing_lock_at, false
  FROM public.workflow_signers ws
  WHERE ws.id = p_signer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_workflow_signing_lock(
  p_workflow_id uuid,
  p_lock_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  UPDATE public.signature_workflows
  SET signing_lock_id = NULL,
      signing_lock_at = NULL
  WHERE id = p_workflow_id
    AND signing_lock_id = p_lock_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_signer_for_signing(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_workflow_signing_lock(uuid, uuid) TO service_role;
