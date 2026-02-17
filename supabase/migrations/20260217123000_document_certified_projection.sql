-- Phase 3: prefer canonical document.certified event in projection
-- Keeps anchor-based fallback for backward compatibility during rollout.

CREATE OR REPLACE FUNCTION public.project_document_entity_to_user_document(
  p_document_entity_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_events JSONB := '[]'::jsonb;
  v_witness_hash TEXT;
  v_owner_id UUID;

  v_has_polygon BOOLEAN := false;
  v_has_bitcoin BOOLEAN := false;
  v_polygon_confirmed_at TIMESTAMPTZ;
  v_bitcoin_confirmed_at TIMESTAMPTZ;

  v_has_document_certified BOOLEAN := false;
  v_document_certified_at TIMESTAMPTZ;

  v_polygon_anchor_id UUID;
  v_bitcoin_anchor_id UUID;

  v_overall_status TEXT := 'pending_anchor';
  v_download_enabled BOOLEAN := false;

  v_updated_rows INTEGER := 0;
BEGIN
  SELECT de.events, de.witness_hash, de.owner_id
  INTO v_events, v_witness_hash, v_owner_id
  FROM public.document_entities de
  WHERE de.id = p_document_entity_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  WITH anchor_confirmed AS (
    SELECT
      e->'anchor'->>'network' AS network,
      NULLIF(e->'anchor'->>'confirmed_at', '')::timestamptz AS confirmed_at
    FROM jsonb_array_elements(v_events) e
    WHERE e->>'kind' = 'anchor.confirmed'
  )
  SELECT
    COALESCE(bool_or(network = 'polygon'), false),
    COALESCE(bool_or(network = 'bitcoin'), false),
    max(confirmed_at) FILTER (WHERE network = 'polygon'),
    max(confirmed_at) FILTER (WHERE network = 'bitcoin')
  INTO
    v_has_polygon,
    v_has_bitcoin,
    v_polygon_confirmed_at,
    v_bitcoin_confirmed_at
  FROM anchor_confirmed;

  -- Canonical certification event for current witness (preferred truth)
  WITH certified AS (
    SELECT
      NULLIF(e->'payload'->>'certified_at', '')::timestamptz AS certified_at,
      e->'payload'->>'witness_hash' AS witness_hash
    FROM jsonb_array_elements(v_events) e
    WHERE e->>'kind' = 'document.certified'
  )
  SELECT
    COALESCE(bool_or(witness_hash IS NULL OR witness_hash = '' OR witness_hash = v_witness_hash), false),
    max(certified_at) FILTER (WHERE witness_hash IS NULL OR witness_hash = '' OR witness_hash = v_witness_hash)
  INTO
    v_has_document_certified,
    v_document_certified_at
  FROM certified;

  -- Backward-compatible fallback while rollout stabilizes.
  IF v_has_document_certified OR v_has_polygon OR v_has_bitcoin THEN
    v_overall_status := 'certified';
    v_download_enabled := true;
  END IF;

  SELECT a.id
  INTO v_polygon_anchor_id
  FROM public.anchors a
  WHERE a.document_entity_id = p_document_entity_id
    AND a.anchor_type = 'polygon'
    AND a.anchor_status = 'confirmed'
  ORDER BY COALESCE(a.confirmed_at, a.updated_at, a.created_at) DESC
  LIMIT 1;

  SELECT a.id
  INTO v_bitcoin_anchor_id
  FROM public.anchors a
  WHERE a.document_entity_id = p_document_entity_id
    AND a.anchor_type = 'opentimestamps'
    AND a.anchor_status = 'confirmed'
  ORDER BY COALESCE(a.confirmed_at, a.updated_at, a.created_at) DESC
  LIMIT 1;

  UPDATE public.user_documents ud
  SET
    has_polygon_anchor = v_has_polygon,
    has_bitcoin_anchor = v_has_bitcoin,
    polygon_anchor_id = v_polygon_anchor_id,
    bitcoin_anchor_id = v_bitcoin_anchor_id,
    polygon_confirmed_at = v_polygon_confirmed_at,
    bitcoin_confirmed_at = v_bitcoin_confirmed_at,
    overall_status = v_overall_status,
    certified_at = COALESCE(v_document_certified_at, v_polygon_confirmed_at, v_bitcoin_confirmed_at, ud.certified_at),
    bitcoin_status = CASE
      WHEN v_has_bitcoin THEN 'confirmed'
      WHEN v_overall_status = 'pending_anchor' THEN 'pending'
      ELSE ud.bitcoin_status
    END,
    download_enabled = v_download_enabled,
    last_event_at = now(),
    updated_at = now()
  WHERE ud.document_entity_id = p_document_entity_id;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    WITH candidate AS (
      SELECT ud.id
      FROM public.user_documents ud
      WHERE ud.document_entity_id IS NULL
        AND ud.user_id = v_owner_id
        AND ud.document_hash = v_witness_hash
      ORDER BY ud.created_at DESC
      LIMIT 1
    )
    UPDATE public.user_documents ud
    SET
      document_entity_id = p_document_entity_id,
      has_polygon_anchor = v_has_polygon,
      has_bitcoin_anchor = v_has_bitcoin,
      polygon_anchor_id = v_polygon_anchor_id,
      bitcoin_anchor_id = v_bitcoin_anchor_id,
      polygon_confirmed_at = v_polygon_confirmed_at,
      bitcoin_confirmed_at = v_bitcoin_confirmed_at,
      overall_status = v_overall_status,
      certified_at = COALESCE(v_document_certified_at, v_polygon_confirmed_at, v_bitcoin_confirmed_at, ud.certified_at),
      bitcoin_status = CASE
        WHEN v_has_bitcoin THEN 'confirmed'
        WHEN v_overall_status = 'pending_anchor' THEN 'pending'
        ELSE ud.bitcoin_status
      END,
      download_enabled = v_download_enabled,
      last_event_at = now(),
      updated_at = now()
    WHERE ud.id = (SELECT id FROM candidate);
  END IF;
END;
$$;

COMMENT ON FUNCTION public.project_document_entity_to_user_document(UUID) IS
  'Projects canonical events[] to user_documents cache. Prefers document.certified; keeps anchor fallback during migration.';
