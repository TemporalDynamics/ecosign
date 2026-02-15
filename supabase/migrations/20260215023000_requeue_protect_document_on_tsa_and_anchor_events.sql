-- Migration: Requeue protect_document_v2 on TSA/Anchor milestones
-- Date: 2026-02-15
-- Purpose:
-- - Make the canonical pipeline deterministic across async stages.
-- - When TSA is confirmed (or anchor confirmed), enqueue a fresh protect_document_v2
--   so decision logic can advance to the next step (anchors/artifact).

CREATE OR REPLACE FUNCTION process_document_entity_events()
RETURNS TRIGGER AS $$
DECLARE
  last_event JSONB;
  document_entity_id UUID;
  event_kind TEXT;
  event_anchor_network TEXT;
  event_anchor_confirmed_at TEXT;
  event_id TEXT;
  stage_key TEXT;
  dedupe_key TEXT;
BEGIN
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF jsonb_array_length(NEW.events) <= jsonb_array_length(OLD.events) THEN
    RETURN NEW;
  END IF;

  -- O(1): process only the last appended event
  last_event := NEW.events -> (jsonb_array_length(NEW.events) - 1);
  document_entity_id := NEW.id;
  event_kind := COALESCE(last_event->>'kind', '');
  event_id := NULLIF(last_event->>'id', '');
  event_anchor_network := COALESCE(last_event->'anchor'->>'network', last_event->'payload'->>'network', '');
  event_anchor_confirmed_at := COALESCE(last_event->'anchor'->>'confirmed_at', last_event->'payload'->>'confirmed_at', '');

  -- Re-evaluate protection flow only on canonical milestones.
  IF event_kind = 'document.protected.requested' THEN
    stage_key := 'awaiting_tsa';
  ELSIF event_kind = 'tsa.confirmed' THEN
    stage_key := 'awaiting_anchors';
  ELSIF event_kind = 'rekor.confirmed' THEN
    stage_key := 'awaiting_artifact';
  ELSIF event_kind = 'anchor.confirmed' THEN
    stage_key := 'awaiting_artifact';
  ELSIF event_kind = 'anchor'
    AND event_anchor_network IN ('polygon', 'bitcoin')
    AND event_anchor_confirmed_at <> '' THEN
    -- Backward-compatible canonical anchor fact (kind='anchor' + confirmed_at).
    stage_key := 'awaiting_artifact';
  ELSE
    stage_key := NULL;
  END IF;

  -- Hard guard: no event id, no requeue (avoid phantom dedupe keys).
  IF stage_key IS NOT NULL AND event_id IS NOT NULL THEN
    dedupe_key := document_entity_id::TEXT || ':protect_document_v2:' || stage_key;

    INSERT INTO executor_jobs (
      type,
      entity_type,
      entity_id,
      correlation_id,
      payload,
      status,
      run_at,
      dedupe_key
    ) VALUES (
      'protect_document_v2',
      'document',
      document_entity_id,
      document_entity_id,
      jsonb_build_object(
        'document_entity_id', document_entity_id,
        'trigger_event', event_kind,
        'trigger_event_id', event_id,
        'stage', stage_key
      ),
      'queued',
      NOW(),
      dedupe_key
    )
    ON CONFLICT (dedupe_key) DO UPDATE
    SET
      status = 'queued',
      run_at = NOW(),
      locked_at = NULL,
      locked_by = NULL,
      last_error = NULL,
      updated_at = NOW()
    WHERE executor_jobs.status IN ('failed', 'retry_scheduled', 'dead');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_document_entity_events() IS
  'Enqueues protect_document_v2 on canonical milestones with stage-based dedupe (awaiting_tsa/awaiting_anchors/awaiting_artifact).';
