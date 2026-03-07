-- Fix ambiguous reference to `status` inside claim_signer_for_signing.
-- The function returns a column named `status` and must always qualify table references.

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
  SELECT ws.workflow_id, ws.status
  INTO v_workflow_id, v_status
  FROM public.workflow_signers ws
  WHERE ws.id = p_signer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT sw.require_sequential
  INTO v_require_sequential
  FROM public.signature_workflows sw
  WHERE sw.id = v_workflow_id
  FOR UPDATE;

  IF v_status IS DISTINCT FROM 'ready_to_sign' THEN
    RETURN QUERY
    SELECT ws.id, ws.workflow_id, ws.status, ws.signing_lock_id, ws.signing_lock_at, false
    FROM public.workflow_signers ws
    WHERE ws.id = p_signer_id;
    RETURN;
  END IF;

  IF v_require_sequential IS DISTINCT FROM false THEN
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
    UPDATE public.signature_workflows sw
    SET signing_lock_id = p_lock_id,
        signing_lock_at = v_now
    WHERE sw.id = v_workflow_id
      AND (
        sw.signing_lock_id IS NULL
        OR sw.signing_lock_at < v_now - make_interval(secs => p_lock_ttl_seconds)
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

  UPDATE public.workflow_signers ws
  SET signing_lock_id = p_lock_id,
      signing_lock_at = v_now
  WHERE ws.id = p_signer_id
    AND ws.status = 'ready_to_sign'
    AND (
      ws.signing_lock_id IS NULL
      OR ws.signing_lock_at < v_now - make_interval(secs => p_lock_ttl_seconds)
    )
  RETURNING ws.id, ws.workflow_id, ws.status, ws.signing_lock_id, ws.signing_lock_at, true
  INTO signer_id, workflow_id, status, signing_lock_id, signing_lock_at, claimed;

  IF FOUND THEN
    RETURN NEXT;
  END IF;

  IF v_require_sequential IS DISTINCT FROM true THEN
    UPDATE public.signature_workflows sw
    SET signing_lock_id = NULL,
        signing_lock_at = NULL
    WHERE sw.id = v_workflow_id
      AND sw.signing_lock_id = p_lock_id;
  END IF;

  RETURN QUERY
  SELECT ws.id, ws.workflow_id, ws.status, ws.signing_lock_id, ws.signing_lock_at, false
  FROM public.workflow_signers ws
  WHERE ws.id = p_signer_id;
END;
$$;
