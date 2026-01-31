-- Migration: Enforce canonical event envelope on new appends
-- Date: 2026-01-31
-- Purpose:
-- Strengthen event writes by requiring an envelope on newly appended events,
-- without retroactively invalidating historical events in events[].
--
-- Required keys on p_event:
-- - id (uuid)
-- - kind (text)
-- - at (ISO string)
-- - v (int)
-- - actor (text)
-- - entity_id (uuid) must match p_document_entity_id
-- - correlation_id (uuid)

CREATE OR REPLACE FUNCTION public.append_document_entity_event(
  p_document_entity_id uuid,
  p_event jsonb,
  p_source text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_payload jsonb;
  event_entity_id uuid;
BEGIN
  IF p_event IS NULL THEN
    RAISE EXCEPTION 'Event payload is required';
  END IF;

  IF jsonb_typeof(p_event) != 'object' THEN
    RAISE EXCEPTION 'Event payload must be a JSON object';
  END IF;

  -- Envelope keys
  IF (p_event ? 'id') IS FALSE
     OR (p_event ? 'kind') IS FALSE
     OR (p_event ? 'at') IS FALSE
     OR (p_event ? 'v') IS FALSE
     OR (p_event ? 'actor') IS FALSE
     OR (p_event ? 'entity_id') IS FALSE
     OR (p_event ? 'correlation_id') IS FALSE THEN
    RAISE EXCEPTION 'Event must include id, kind, at, v, actor, entity_id, correlation_id';
  END IF;

  -- Basic kind hygiene
  IF position('_' in (p_event->>'kind')) > 0 THEN
    RAISE EXCEPTION 'Event kind must not contain underscore: %', p_event->>'kind';
  END IF;

  -- entity_id must match
  event_entity_id := (p_event->>'entity_id')::uuid;
  IF event_entity_id IS DISTINCT FROM p_document_entity_id THEN
    RAISE EXCEPTION 'Event entity_id (%) must match document_entity_id (%)', event_entity_id, p_document_entity_id;
  END IF;

  event_payload := p_event;
  IF p_source IS NOT NULL AND p_source <> '' THEN
    event_payload := event_payload || jsonb_build_object('_source', p_source);
  END IF;

  PERFORM set_config('app.events_write', 'true', true);

  UPDATE public.document_entities
  SET events = COALESCE(events, '[]'::jsonb) || jsonb_build_array(event_payload)
  WHERE id = p_document_entity_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'document_entities id not found: %', p_document_entity_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.append_document_entity_event(uuid, jsonb, text) IS
  'Append-only writer for document_entities.events[]; requires canonical envelope keys for new appends.';
