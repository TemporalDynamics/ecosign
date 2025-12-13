-- P0-3 FIX: Atomic transaction for Polygon anchors
-- Ensures anchors, user_documents and audit_logs are committed together
-- Prevents split updates that can leave inconsistent state

CREATE OR REPLACE FUNCTION public.anchor_polygon_atomic_tx(
  _anchor_id UUID,
  _anchor_user_id UUID,
  _tx_hash TEXT,
  _block_number BIGINT,
  _block_hash TEXT,
  _confirmed_at TIMESTAMPTZ,
  _metadata JSONB DEFAULT NULL,
  _user_document_updates JSONB DEFAULT NULL,
  _polygon_attempts INTEGER DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_document_id UUID;
BEGIN
  -- Transaction-scoped lock to avoid races per anchor
  PERFORM pg_advisory_xact_lock(hashtext(_anchor_id::text));

  -- Lock anchor row and fetch document_id
  SELECT document_id INTO v_document_id
  FROM public.anchors
  WHERE id = _anchor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Anchor % not found', _anchor_id;
  END IF;

  -- 1) Update anchor with blockchain data
  UPDATE public.anchors
  SET
    anchor_status = 'confirmed',
    polygon_status = 'confirmed',
    polygon_tx_hash = _tx_hash,
    polygon_block_number = _block_number,
    polygon_block_hash = _block_hash,
    polygon_confirmed_at = _confirmed_at,
    confirmed_at = _confirmed_at,
    polygon_attempts = COALESCE(_polygon_attempts, polygon_attempts),
    metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(_metadata, '{}'::jsonb),
    updated_at = now(),
    polygon_error_message = NULL
  WHERE id = _anchor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update anchor %', _anchor_id;
  END IF;

  -- 2) Update linked user_documents atomically (if provided)
  IF _user_document_updates IS NOT NULL THEN
    UPDATE public.user_documents
    SET
      has_polygon_anchor = COALESCE((_user_document_updates->>'has_polygon_anchor')::boolean, has_polygon_anchor),
      polygon_anchor_id = COALESCE((_user_document_updates->>'polygon_anchor_id')::uuid, polygon_anchor_id),
      overall_status = COALESCE(_user_document_updates->>'overall_status', overall_status),
      download_enabled = COALESCE((_user_document_updates->>'download_enabled')::boolean, download_enabled),
      updated_at = now()
    WHERE id = (_user_document_updates->>'document_id')::uuid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'User document % not found for anchor %', _user_document_updates->>'document_id', _anchor_id;
    END IF;
  END IF;

  -- 3) Audit log for traceability
  INSERT INTO public.audit_logs (user_id, action, metadata)
  VALUES (
    _anchor_user_id,
    'polygon_anchor_finalized',
    jsonb_build_object(
      'anchor_id', _anchor_id,
      'document_id', v_document_id,
      'user_document_id', CASE WHEN _user_document_updates IS NULL THEN NULL ELSE (_user_document_updates->>'document_id')::uuid END,
      'polygon_tx_hash', _tx_hash,
      'polygon_block_number', _block_number,
      'polygon_block_hash', _block_hash,
      'confirmed_at', _confirmed_at
    ) || COALESCE(_metadata, '{}'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.anchor_polygon_atomic_tx IS 
'Atomically update anchors + user_documents + audit_logs for Polygon confirmations. Prevents split-brain state.';

GRANT EXECUTE ON FUNCTION public.anchor_polygon_atomic_tx(
  UUID, UUID, TEXT, BIGINT, TEXT, TIMESTAMPTZ, JSONB, JSONB, INTEGER
) TO service_role;
