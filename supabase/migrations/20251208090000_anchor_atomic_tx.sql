-- Atomic anchoring transaction for Bitcoin anchors
-- Ensures OTS, anchors, user_documents and audit_logs are committed together

-- Ensure OTS storage table exists (bytea content)
CREATE TABLE IF NOT EXISTS public.bitcoin_ots_files (
  anchor_id UUID PRIMARY KEY REFERENCES public.anchors(id) ON DELETE CASCADE,
  ots_content BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bitcoin_ots_files IS 'Raw OTS files associated to anchors (bytea)';
COMMENT ON COLUMN public.bitcoin_ots_files.ots_content IS 'Binary OTS file content';

-- Main atomic function
CREATE OR REPLACE FUNCTION public.anchor_atomic_tx(
  _anchor_id UUID,
  _anchor_user_id UUID,
  _ots BYTEA,
  _metadata JSONB,
  _user_document_updates JSONB DEFAULT NULL,
  _bitcoin_attempts INTEGER DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_document_id UUID;
  v_confirmed_at TIMESTAMPTZ;
BEGIN
  -- Transaction-scoped lock to avoid races per anchor
  PERFORM pg_advisory_xact_lock(hashtext(_anchor_id::text));

  -- Lock anchor row and fetch document_id
  SELECT document_id, COALESCE((_metadata->>'confirmed_at')::timestamptz, now())
    INTO v_document_id, v_confirmed_at
  FROM public.anchors
  WHERE id = _anchor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Anchor % not found', _anchor_id;
  END IF;

  -- 1) Persist OTS file bytes (idempotent)
  INSERT INTO public.bitcoin_ots_files(anchor_id, ots_content)
  VALUES (_anchor_id, _ots)
  ON CONFLICT (anchor_id) DO UPDATE
    SET ots_content = EXCLUDED.ots_content,
        updated_at = now();

  -- 2) Update anchor with blockchain data
  UPDATE public.anchors
  SET
    bitcoin_tx_id = COALESCE(_metadata->>'bitcoin_tx', bitcoin_tx_id),
    bitcoin_block_height = CASE
      WHEN (_metadata ? 'block') THEN NULLIF((_metadata->>'block')::INT, 0)
      ELSE bitcoin_block_height
    END,
    anchor_status = 'confirmed',
    ots_proof = encode(_ots, 'base64'),
    metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(_metadata, '{}'::jsonb),
    bitcoin_attempts = COALESCE(_bitcoin_attempts, bitcoin_attempts),
    confirmed_at = v_confirmed_at,
    updated_at = now(),
    error_message = NULL
  WHERE id = _anchor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update anchor %', _anchor_id;
  END IF;

  -- 3) Update linked user_documents atomically (if provided)
  IF _user_document_updates IS NOT NULL THEN
    UPDATE public.user_documents
    SET
      bitcoin_status = COALESCE(_user_document_updates->>'bitcoin_status', bitcoin_status),
      bitcoin_confirmed_at = COALESCE((_user_document_updates->>'bitcoin_confirmed_at')::timestamptz, bitcoin_confirmed_at),
      overall_status = COALESCE(_user_document_updates->>'overall_status', overall_status),
      download_enabled = COALESCE((_user_document_updates->>'download_enabled')::boolean, download_enabled),
      bitcoin_anchor_id = COALESCE((_user_document_updates->>'bitcoin_anchor_id')::uuid, bitcoin_anchor_id),
      updated_at = now()
    WHERE id = (_user_document_updates->>'document_id')::uuid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'User document % not found for anchor %', _user_document_updates->>'document_id', _anchor_id;
    END IF;
  END IF;

  -- 4) Audit log for traceability
  INSERT INTO public.audit_logs (user_id, action, metadata)
  VALUES (
    _anchor_user_id,
    'bitcoin_anchor_finalized',
    jsonb_build_object(
      'anchor_id', _anchor_id,
      'document_id', v_document_id,
      'user_document_id', CASE WHEN _user_document_updates IS NULL THEN NULL ELSE (_user_document_updates->>'document_id')::uuid END,
      'bitcoin_tx_id', _metadata->>'bitcoin_tx',
      'bitcoin_block_height', CASE WHEN (_metadata ? 'block') THEN NULLIF((_metadata->>'block')::int, 0) ELSE NULL END,
      'confirmed_at', v_confirmed_at
    ) || COALESCE(_metadata, '{}'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.anchor_atomic_tx(
  UUID, UUID, BYTEA, JSONB, JSONB, INTEGER
) TO service_role;
