-- Migration: Guard document_entities.events[] writes
-- Date: 2026-01-17
-- Purpose: Enforce append-only + kind/at schema and block direct updates

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
BEGIN
  IF p_event IS NULL THEN
    RAISE EXCEPTION 'Event payload is required';
  END IF;

  IF jsonb_typeof(p_event) != 'object' THEN
    RAISE EXCEPTION 'Event payload must be a JSON object';
  END IF;

  IF (p_event ? 'kind') IS FALSE OR (p_event ? 'at') IS FALSE THEN
    RAISE EXCEPTION 'Event must include kind and at';
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
  'Append-only writer for document_entities.events[]; required for canonical ledger updates.';

CREATE OR REPLACE FUNCTION public.enforce_events_write_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  missing_kind_or_at boolean;
  allow_write text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.events IS DISTINCT FROM OLD.events THEN
      allow_write := current_setting('app.events_write', true);
      IF allow_write IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'Direct events[] updates are forbidden; use append_document_entity_event()';
      END IF;

      IF NEW.events IS NULL OR jsonb_typeof(NEW.events) != 'array' THEN
        RAISE EXCEPTION 'events[] must be a JSON array';
      END IF;

      missing_kind_or_at := jsonb_path_exists(
        NEW.events,
        '$[*] ? (!exists(@.kind) || !exists(@.at))'
      );

      IF missing_kind_or_at THEN
        RAISE EXCEPTION 'All events must include kind and at';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_write_guard ON public.document_entities;

CREATE TRIGGER trg_events_write_guard
BEFORE UPDATE OF events ON public.document_entities
FOR EACH ROW
EXECUTE FUNCTION public.enforce_events_write_guard();

REVOKE UPDATE (events) ON public.document_entities FROM authenticated;

GRANT EXECUTE ON FUNCTION public.append_document_entity_event(uuid, jsonb, text) TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS anchors_user_document_anchor_type_uniq
ON public.anchors (user_document_id, anchor_type)
WHERE user_document_id IS NOT NULL;
