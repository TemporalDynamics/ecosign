-- Migration: Fase 1 canonical close (no legacy protection_enabled)
-- Date: 2026-01-31
-- Purpose:
-- 1) Remove legacy tolerance for underscore event kinds in document_entities.events[].
-- 2) Ensure append_document_entity_event() enforces canonical envelope + dot-notation strictly.
-- 3) Update ACTIVE guard to rely on canonical events only (no protection_enabled).

-- 1) Canonical append-only writer (strict dot-notation, canonical envelope required)
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

  -- Canonical envelope keys
  IF (p_event ? 'id') IS FALSE
     OR (p_event ? 'kind') IS FALSE
     OR (p_event ? 'at') IS FALSE
     OR (p_event ? 'v') IS FALSE
     OR (p_event ? 'actor') IS FALSE
     OR (p_event ? 'entity_id') IS FALSE
     OR (p_event ? 'correlation_id') IS FALSE THEN
    RAISE EXCEPTION 'Event must include id, kind, at, v, actor, entity_id, correlation_id';
  END IF;

  -- Dot-notation enforcement (no legacy allowlists)
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
  'Append-only writer for document_entities.events[]; requires canonical envelope keys and strict dot-notation (no underscores).';

-- 2) ACTIVE protection_level guard should rely on canonical events only.
-- ACTIVE must never be set without a canonical entity + explicit request + TSA evidence.
CREATE OR REPLACE FUNCTION public.enforce_active_requires_proof_events()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  has_protection_requested boolean;
  has_tsa_confirmed boolean;
BEGIN
  -- Only enforce when a row is created/updated into ACTIVE state.
  IF TG_OP = 'INSERT' THEN
    IF NEW.protection_level IS DISTINCT FROM 'ACTIVE' THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.protection_level IS DISTINCT FROM 'ACTIVE' THEN
      RETURN NEW;
    END IF;

    -- If it was already ACTIVE and the linkage/state did not change, skip.
    IF OLD.protection_level IS NOT DISTINCT FROM NEW.protection_level
       AND OLD.document_entity_id IS NOT DISTINCT FROM NEW.document_entity_id THEN
      RETURN NEW;
    END IF;
  END IF;

  -- ACTIVE requires a canonical entity.
  IF NEW.document_entity_id IS NULL THEN
    RAISE EXCEPTION 'protection_level=ACTIVE requires document_entity_id (user_document_id=%)', NEW.id;
  END IF;

  -- Validate canonical proof events exist.
  SELECT
    jsonb_path_exists(COALESCE(de.events, '[]'::jsonb), '$[*] ? (@.kind == "document.protected.requested")'),
    jsonb_path_exists(COALESCE(de.events, '[]'::jsonb), '$[*] ? (@.kind == "tsa.confirmed")')
  INTO has_protection_requested, has_tsa_confirmed
  FROM public.document_entities de
  WHERE de.id = NEW.document_entity_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'protection_level=ACTIVE requires existing document_entities row (document_entity_id=%, user_document_id=%)',
      NEW.document_entity_id, NEW.id;
  END IF;

  IF NOT has_protection_requested OR NOT has_tsa_confirmed THEN
    RAISE EXCEPTION 'protection_level=ACTIVE requires proof events (document.protected.requested=% tsa.confirmed=%) for document_entity_id=% user_document_id=%',
      has_protection_requested, has_tsa_confirmed, NEW.document_entity_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_active_requires_proof_events() IS
  'Rejects inserts/updates that set protection_level=ACTIVE without required canonical proof events in document_entities.events[] (document.protected.requested + tsa.confirmed).';

-- 3) Event-to-job trigger: remove protection_enabled branch and enqueue canonical decision job
-- When document.protected.requested is appended, enqueue protect_document_v2 (idempotent).
CREATE OR REPLACE FUNCTION process_document_entity_events()
RETURNS TRIGGER AS $$
DECLARE
  last_event JSONB;
  document_entity_id UUID;
  event_kind TEXT;
BEGIN
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF jsonb_array_length(NEW.events) <= jsonb_array_length(OLD.events) THEN
    RETURN NEW;
  END IF;

  last_event := NEW.events -> (jsonb_array_length(NEW.events) - 1);
  document_entity_id := NEW.id;
  event_kind := last_event->>'kind';

  CASE event_kind
    WHEN 'document.protected.requested' THEN
      INSERT INTO executor_jobs (
        type,
        entity_type,
        entity_id,
        payload,
        status,
        run_at,
        dedupe_key
      ) VALUES (
        'protect_document_v2',
        'document',
        document_entity_id,
        jsonb_build_object(
          'document_entity_id', document_entity_id,
          'trigger_event', 'document.protected.requested'
        ),
        'queued',
        NOW(),
        document_entity_id::TEXT || ':protect_document_v2'
      )
      ON CONFLICT (dedupe_key) DO NOTHING;
    ELSE
      NULL;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_document_entity_events() IS
  'Processes only the last appended event (O(1)). On document.protected.requested, enqueues protect_document_v2. No legacy protection_enabled handling.';
