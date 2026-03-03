-- Fix projection: INSERT when no user_documents record exists + extract eco_storage_path
-- Root cause: project_document_entity_to_user_document only had UPDATE paths.
-- New documents (post-freeze) had no record to UPDATE, so projection silently did nothing.
-- Also: eco_storage_path from artifact.finalized was never projected.

CREATE OR REPLACE FUNCTION public.project_document_entity_to_user_document(
  p_document_entity_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_events            JSONB := '[]'::jsonb;
  v_witness_hash      TEXT;
  v_owner_id          UUID;
  v_source_name       TEXT;
  v_source_size       BIGINT;
  v_source_mime       TEXT;

  v_has_polygon       BOOLEAN := false;
  v_has_bitcoin       BOOLEAN := false;
  v_polygon_confirmed_at  TIMESTAMPTZ;
  v_bitcoin_confirmed_at  TIMESTAMPTZ;

  v_polygon_anchor_id UUID;
  v_bitcoin_anchor_id UUID;

  v_overall_status    TEXT := 'pending_anchor';
  v_download_enabled  BOOLEAN := false;
  v_eco_storage_path  TEXT := null;

  v_updated_rows      INTEGER := 0;
BEGIN
  SELECT de.events, de.witness_hash, de.owner_id, de.source_name, de.source_size, de.source_mime
  INTO v_events, v_witness_hash, v_owner_id, v_source_name, v_source_size, v_source_mime
  FROM public.document_entities de
  WHERE de.id = p_document_entity_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Extract anchor confirmations
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

  IF v_has_polygon OR v_has_bitcoin THEN
    v_overall_status := 'certified';
    v_download_enabled := true;
  ELSIF v_events @> '[{"kind": "artifact.finalized"}]' THEN
    v_overall_status := 'certified';
    v_download_enabled := true;
  END IF;

  -- Extract eco_storage_path from latest artifact.finalized event
  SELECT e->'payload'->>'eco_storage_path'
  INTO v_eco_storage_path
  FROM jsonb_array_elements(v_events) e
  WHERE e->>'kind' = 'artifact.finalized'
  ORDER BY (e->>'at') DESC
  LIMIT 1;

  SELECT a.id INTO v_polygon_anchor_id
  FROM public.anchors a
  WHERE a.document_entity_id = p_document_entity_id
    AND a.anchor_type = 'polygon'
    AND a.anchor_status = 'confirmed'
  ORDER BY COALESCE(a.confirmed_at, a.updated_at, a.created_at) DESC
  LIMIT 1;

  SELECT a.id INTO v_bitcoin_anchor_id
  FROM public.anchors a
  WHERE a.document_entity_id = p_document_entity_id
    AND a.anchor_type = 'opentimestamps'
    AND a.anchor_status = 'confirmed'
  ORDER BY COALESCE(a.confirmed_at, a.updated_at, a.created_at) DESC
  LIMIT 1;

  -- Try UPDATE by document_entity_id (already linked)
  UPDATE public.user_documents ud
  SET
    has_polygon_anchor     = v_has_polygon,
    has_bitcoin_anchor     = v_has_bitcoin,
    polygon_anchor_id      = v_polygon_anchor_id,
    bitcoin_anchor_id      = v_bitcoin_anchor_id,
    polygon_confirmed_at   = v_polygon_confirmed_at,
    bitcoin_confirmed_at   = v_bitcoin_confirmed_at,
    overall_status         = v_overall_status,
    eco_storage_path       = COALESCE(v_eco_storage_path, ud.eco_storage_path),
    bitcoin_status = CASE
      WHEN v_has_bitcoin THEN 'confirmed'
      WHEN v_overall_status = 'pending_anchor' THEN 'pending'
      ELSE ud.bitcoin_status
    END,
    download_enabled  = v_download_enabled,
    last_event_at     = now(),
    updated_at        = now()
  WHERE ud.document_entity_id = p_document_entity_id;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  -- Fallback: try to link an existing unlinked record by user + hash
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
      document_entity_id   = p_document_entity_id,
      has_polygon_anchor   = v_has_polygon,
      has_bitcoin_anchor   = v_has_bitcoin,
      polygon_anchor_id    = v_polygon_anchor_id,
      bitcoin_anchor_id    = v_bitcoin_anchor_id,
      polygon_confirmed_at = v_polygon_confirmed_at,
      bitcoin_confirmed_at = v_bitcoin_confirmed_at,
      overall_status       = v_overall_status,
      eco_storage_path     = COALESCE(v_eco_storage_path, ud.eco_storage_path),
      bitcoin_status = CASE
        WHEN v_has_bitcoin THEN 'confirmed'
        WHEN v_overall_status = 'pending_anchor' THEN 'pending'
        ELSE ud.bitcoin_status
      END,
      download_enabled = v_download_enabled,
      last_event_at    = now(),
      updated_at       = now()
    WHERE ud.id = (SELECT id FROM candidate);

    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  END IF;

  -- INSERT: no record exists at all — create it from the entity
  IF v_updated_rows = 0 THEN
    INSERT INTO public.user_documents (
      user_id,
      document_entity_id,
      document_name,
      document_hash,
      document_size,
      mime_type,
      eco_data,
      has_polygon_anchor,
      has_bitcoin_anchor,
      polygon_anchor_id,
      bitcoin_anchor_id,
      polygon_confirmed_at,
      bitcoin_confirmed_at,
      overall_status,
      eco_storage_path,
      download_enabled,
      last_event_at,
      created_at,
      updated_at
    ) VALUES (
      v_owner_id,
      p_document_entity_id,
      v_source_name,
      v_witness_hash,
      COALESCE(v_source_size, 0),
      COALESCE(v_source_mime, 'application/pdf'),
      '{}'::jsonb,
      v_has_polygon,
      v_has_bitcoin,
      v_polygon_anchor_id,
      v_bitcoin_anchor_id,
      v_polygon_confirmed_at,
      v_bitcoin_confirmed_at,
      v_overall_status,
      v_eco_storage_path,
      v_download_enabled,
      now(),
      now(),
      now()
    );
  END IF;

END;
$$;
