-- Anchor concurrency + idempotence hardening
-- Goals:
-- 1) Deterministic worker claim under concurrent execution (FOR UPDATE SKIP LOCKED)
-- 2) Atomic dedupe for anchor events inside append_document_entity_event
-- 3) Idempotent outbox for blockchain confirmation notifications

CREATE OR REPLACE FUNCTION public.try_parse_timestamptz(p_text text)
RETURNS timestamptz
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_text IS NULL OR btrim(p_text) = '' THEN
    RETURN NULL;
  END IF;

  RETURN p_text::timestamptz;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.try_parse_timestamptz(text) IS
  'Safe parser for timestamptz text values. Returns NULL instead of raising on invalid input.';

CREATE OR REPLACE FUNCTION public.claim_anchor_batch(
  p_network text,
  p_phase text DEFAULT 'pending',
  p_limit integer DEFAULT 25
)
RETURNS SETOF public.anchors
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := GREATEST(COALESCE(p_limit, 25), 1);
BEGIN
  IF p_network NOT IN ('bitcoin', 'polygon') THEN
    RAISE EXCEPTION 'Invalid network: % (expected bitcoin|polygon)', p_network;
  END IF;

  IF p_phase NOT IN ('queued', 'pending') THEN
    RAISE EXCEPTION 'Invalid phase: % (expected queued|pending)', p_phase;
  END IF;

  IF p_phase = 'queued' THEN
    IF p_network <> 'bitcoin' THEN
      RAISE EXCEPTION 'Queued phase is only valid for bitcoin anchors';
    END IF;

    RETURN QUERY
    WITH candidates AS (
      SELECT a.id
      FROM public.anchors a
      WHERE a.anchor_type = 'opentimestamps'
        AND (
          a.anchor_status = 'queued'
          OR (
            a.anchor_status = 'processing'
            AND a.ots_proof IS NULL
            AND a.updated_at < now() - interval '10 minutes'
          )
        )
      ORDER BY a.created_at ASC
      LIMIT v_limit
      FOR UPDATE SKIP LOCKED
    ), claimed AS (
      UPDATE public.anchors a
      SET anchor_status = 'processing',
          updated_at = now()
      FROM candidates c
      WHERE a.id = c.id
      RETURNING a.*
    )
    SELECT * FROM claimed;

    RETURN;
  END IF;

  IF p_network = 'bitcoin' THEN
    RETURN QUERY
    WITH candidates AS (
      SELECT a.id
      FROM public.anchors a
      WHERE a.anchor_type = 'opentimestamps'
        AND a.anchor_status IN ('pending', 'processing')
        AND a.ots_proof IS NOT NULL
        AND a.ots_calendar_url IS NOT NULL
        AND (
          public.try_parse_timestamptz(a.metadata->>'nextRetryAt') IS NULL
          OR public.try_parse_timestamptz(a.metadata->>'nextRetryAt') <= now()
        )
      ORDER BY a.bitcoin_attempts ASC, a.updated_at ASC
      LIMIT v_limit
      FOR UPDATE SKIP LOCKED
    ), claimed AS (
      UPDATE public.anchors a
      SET anchor_status = 'processing',
          updated_at = now()
      FROM candidates c
      WHERE a.id = c.id
      RETURNING a.*
    )
    SELECT * FROM claimed;

    RETURN;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT a.id
    FROM public.anchors a
    WHERE a.anchor_type = 'polygon'
      AND (
        a.polygon_status IN ('pending', 'processing')
        OR a.anchor_status IN ('pending', 'processing')
      )
      AND (
        public.try_parse_timestamptz(a.metadata->>'nextRetryAt') IS NULL
        OR public.try_parse_timestamptz(a.metadata->>'nextRetryAt') <= now()
      )
    ORDER BY a.polygon_attempts ASC, a.updated_at ASC
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE public.anchors a
    SET anchor_status = 'processing',
        polygon_status = 'processing',
        updated_at = now()
    FROM candidates c
    WHERE a.id = c.id
    RETURNING a.*
  )
  SELECT * FROM claimed;
END;
$$;

COMMENT ON FUNCTION public.claim_anchor_batch(text, text, integer) IS
  'Atomically claims anchor rows for workers using FOR UPDATE SKIP LOCKED. Prevents duplicate concurrent processing.';

GRANT EXECUTE ON FUNCTION public.claim_anchor_batch(text, text, integer) TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS workflow_notifications_anchor_confirmed_unique
ON public.workflow_notifications (workflow_id, recipient_email, notification_type)
WHERE workflow_id IS NOT NULL
  AND notification_type IN ('bitcoin_confirmed', 'polygon_confirmed');

COMMENT ON INDEX public.workflow_notifications_anchor_confirmed_unique IS
  'Idempotent outbox key for blockchain confirmation notifications.';

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
  current_events jsonb;
  event_kind text;
  event_anchor jsonb;
  event_witness_hash text;
  event_network text;
  event_anchor_stage text;
  event_step_index text;
  is_duplicate boolean;
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

  IF position('_' in (p_event->>'kind')) > 0 THEN
    RAISE EXCEPTION 'Event kind must not contain underscore: %', p_event->>'kind';
  END IF;

  event_entity_id := (p_event->>'entity_id')::uuid;
  IF event_entity_id IS DISTINCT FROM p_document_entity_id THEN
    RAISE EXCEPTION 'Event entity_id (%) must match document_entity_id (%)', event_entity_id, p_document_entity_id;
  END IF;

  -- Atomic read-lock of current ledger state.
  SELECT COALESCE(de.events, '[]'::jsonb)
  INTO current_events
  FROM public.document_entities de
  WHERE de.id = p_document_entity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'document_entities id not found: %', p_document_entity_id;
  END IF;

  event_kind := p_event->>'kind';

  -- Atomic idempotence for anchor lifecycle events.
  IF event_kind IN ('anchor.confirmed', 'anchor.submitted', 'anchor.failed', 'anchor.timeout') THEN
    event_anchor := COALESCE(p_event->'anchor', '{}'::jsonb);
    event_witness_hash := event_anchor->>'witness_hash';
    event_network := event_anchor->>'network';
    event_anchor_stage := COALESCE(event_anchor->>'anchor_stage', 'initial');
    event_step_index := COALESCE(event_anchor->>'step_index', '0');

    IF event_witness_hash IS NOT NULL AND event_network IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(current_events) e
        WHERE e->>'kind' = event_kind
          AND COALESCE(e->'anchor'->>'witness_hash', '') = event_witness_hash
          AND COALESCE(e->'anchor'->>'network', '') = event_network
          AND COALESCE(e->'anchor'->>'anchor_stage', 'initial') = event_anchor_stage
          AND COALESCE(e->'anchor'->>'step_index', '0') = event_step_index
      ) INTO is_duplicate;

      IF is_duplicate THEN
        RETURN;
      END IF;
    END IF;
  END IF;

  event_payload := p_event;
  IF p_source IS NOT NULL AND p_source <> '' THEN
    event_payload := event_payload || jsonb_build_object('_source', p_source);
  END IF;

  PERFORM set_config('app.events_write', 'true', true);

  UPDATE public.document_entities
  SET events = current_events || jsonb_build_array(event_payload)
  WHERE id = p_document_entity_id;
END;
$$;

COMMENT ON FUNCTION public.append_document_entity_event(uuid, jsonb, text) IS
  'Append-only writer for document_entities.events[] with strict envelope and atomic idempotence for anchor lifecycle events.';
