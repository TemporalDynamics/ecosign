-- Projection Trigger: document_entities.events[] -> user_documents (materialized cache)
-- Authority remains in document_entities.events[]

-- Project one entity deterministically from canonical events[]
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

  -- Canonical facts: only anchor.confirmed contributes to certification.
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

  -- Legacy product policy preserved for now: Polygon OR Bitcoin confirmed => certified.
  IF v_has_polygon OR v_has_bitcoin THEN
    v_overall_status := 'certified';
    v_download_enabled := true;
  END IF;

  -- Resolve latest anchor row ids as cache pointers (non-authoritative).
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

  -- 1) Preferred path: update already-linked legacy row.
  UPDATE public.user_documents ud
  SET
    has_polygon_anchor = v_has_polygon,
    has_bitcoin_anchor = v_has_bitcoin,
    polygon_anchor_id = v_polygon_anchor_id,
    bitcoin_anchor_id = v_bitcoin_anchor_id,
    polygon_confirmed_at = v_polygon_confirmed_at,
    bitcoin_confirmed_at = v_bitcoin_confirmed_at,
    overall_status = v_overall_status,
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

  -- 2) Fallback path: legacy row not linked yet; attach by (owner_id + witness_hash) best-effort.
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

-- Trigger wrapper for append-only event updates.
CREATE OR REPLACE FUNCTION public.project_events_to_user_document_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.project_document_entity_to_user_document(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_events_to_user_document ON public.document_entities;
CREATE TRIGGER trg_project_events_to_user_document
  AFTER UPDATE OF events ON public.document_entities
  FOR EACH ROW
  WHEN (COALESCE(jsonb_array_length(NEW.events), 0) > COALESCE(jsonb_array_length(OLD.events), 0))
  EXECUTE FUNCTION public.project_events_to_user_document_trigger();

-- Rebuild helpers for operational recovery/testing.
CREATE OR REPLACE FUNCTION public.rebuild_user_documents_projection(
  p_document_entity_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_id UUID;
BEGIN
  IF p_document_entity_id IS NOT NULL THEN
    PERFORM public.project_document_entity_to_user_document(p_document_entity_id);
    RETURN 1;
  END IF;

  FOR v_id IN SELECT id FROM public.document_entities LOOP
    PERFORM public.project_document_entity_to_user_document(v_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.project_document_entity_to_user_document(UUID) IS
  'Projects canonical events[] of one document_entity into user_documents cache. Deterministic and rebuildable.';

COMMENT ON FUNCTION public.project_events_to_user_document_trigger() IS
  'Trigger wrapper: executes projection after events[] append.';

COMMENT ON FUNCTION public.rebuild_user_documents_projection(UUID) IS
  'Rebuilds user_documents projection from canonical events[]. Pass NULL for full rebuild.';

COMMENT ON TRIGGER trg_project_events_to_user_document ON public.document_entities IS
  'Projects canonical events[] to user_documents materialized cache on append.';

GRANT EXECUTE ON FUNCTION public.project_document_entity_to_user_document(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.project_events_to_user_document_trigger() TO service_role;
GRANT EXECUTE ON FUNCTION public.rebuild_user_documents_projection(UUID) TO service_role;
