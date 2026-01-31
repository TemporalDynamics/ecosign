-- Migration: Allow legacy underscore event kinds
-- Date: 2026-01-31
-- Purpose:
-- We enforce dot-notation for new events, but a small legacy set still exists.
-- This migration allows those legacy kinds while keeping the underscore ban for new kinds.

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
  event_kind text;
BEGIN
  IF p_event IS NULL THEN
    RAISE EXCEPTION 'Event payload is required';
  END IF;

  IF jsonb_typeof(p_event) != 'object' THEN
    RAISE EXCEPTION 'Event payload must be a JSON object';
  END IF;

  IF (p_event ? 'id') IS FALSE
     OR (p_event ? 'kind') IS FALSE
     OR (p_event ? 'at') IS FALSE
     OR (p_event ? 'v') IS FALSE
     OR (p_event ? 'actor') IS FALSE
     OR (p_event ? 'entity_id') IS FALSE
     OR (p_event ? 'correlation_id') IS FALSE THEN
    RAISE EXCEPTION 'Event must include id, kind, at, v, actor, entity_id, correlation_id';
  END IF;

  event_kind := p_event->>'kind';

  -- Dot-notation enforcement (legacy allowlist)
  IF position('_' in event_kind) > 0 AND event_kind <> 'protection_enabled' THEN
    RAISE EXCEPTION 'Event kind must not contain underscore: %', event_kind;
  END IF;

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
  'Append-only writer for document_entities.events[]; requires canonical envelope keys. Underscore kinds are forbidden except legacy protection_enabled.';
