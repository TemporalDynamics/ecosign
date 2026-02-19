-- Hotfix: resolve PL/pgSQL variable/column ambiguity on dedupe_key
-- Date: 2026-02-19
-- Symptom:
--   record-protection-event fails with:
--   "Failed to append event: column reference \"dedupe_key\" is ambiguous"
-- Cause:
--   process_document_entity_events() declares variables named dedupe_key/job_dedupe_key
--   while inserting into executor_jobs(dedupe_key), which can conflict under strict settings.
-- Fix:
--   rename local variables to v_stage_dedupe_key / v_job_dedupe_key.

CREATE OR REPLACE FUNCTION process_document_entity_events()
RETURNS TRIGGER AS $$
DECLARE
  last_event JSONB;
  document_entity_id UUID;
  event_kind TEXT;
  event_anchor_network TEXT;
  event_anchor_confirmed_at TEXT;
  event_id TEXT;
  event_witness_hash TEXT;

  -- protect_document_v2 requeue
  stage_key TEXT;
  v_stage_dedupe_key TEXT;

  -- execution job enqueue from operational events
  job_type TEXT;
  v_job_dedupe_key TEXT;
  job_payload JSONB;
BEGIN
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF jsonb_array_length(NEW.events) <= jsonb_array_length(OLD.events) THEN
    RETURN NEW;
  END IF;

  last_event := NEW.events -> (jsonb_array_length(NEW.events) - 1);
  document_entity_id := NEW.id;
  event_kind := COALESCE(last_event->>'kind', '');
  event_id := NULLIF(last_event->>'id', '');
  event_witness_hash := COALESCE(
    last_event->'anchor'->>'witness_hash',
    last_event->'payload'->>'witness_hash',
    last_event->>'witness_hash',
    ''
  );
  event_anchor_network := COALESCE(last_event->'anchor'->>'network', last_event->'payload'->>'network', '');
  event_anchor_confirmed_at := COALESCE(last_event->'anchor'->>'confirmed_at', last_event->'payload'->>'confirmed_at', '');

  -- A) Re-evaluate protection flow milestones -> protect_document_v2
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
    stage_key := 'awaiting_artifact';
  ELSE
    stage_key := NULL;
  END IF;

  IF stage_key IS NOT NULL AND event_id IS NOT NULL THEN
    IF stage_key IN ('awaiting_anchors', 'awaiting_artifact') THEN
      v_stage_dedupe_key := document_entity_id::TEXT || ':protect_document_v2:' || stage_key || ':' ||
        COALESCE(NULLIF(event_witness_hash, ''), 'none');
    ELSE
      v_stage_dedupe_key := document_entity_id::TEXT || ':protect_document_v2:' || stage_key;
    END IF;

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
        'stage', stage_key,
        'witness_hash', NULLIF(event_witness_hash, '')
      ),
      'queued',
      NOW(),
      v_stage_dedupe_key
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

  -- B) Operational canonical events -> concrete execution jobs
  job_type := NULL;
  v_job_dedupe_key := NULL;
  job_payload := NULL;

  IF event_kind = 'job.run-tsa.required' THEN
    job_type := 'run_tsa';
    v_job_dedupe_key := document_entity_id::TEXT || ':run_tsa:' || COALESCE(NULLIF(event_witness_hash, ''), 'none');
  ELSIF event_kind = 'job.submit-anchor-polygon.required' THEN
    job_type := 'submit_anchor_polygon';
    v_job_dedupe_key := document_entity_id::TEXT || ':submit_anchor_polygon:' || COALESCE(NULLIF(event_witness_hash, ''), 'none');
  ELSIF event_kind = 'job.submit-anchor-bitcoin.required' THEN
    job_type := 'submit_anchor_bitcoin';
    v_job_dedupe_key := document_entity_id::TEXT || ':submit_anchor_bitcoin:' || COALESCE(NULLIF(event_witness_hash, ''), 'none');
  ELSIF event_kind = 'job.build-artifact.required' THEN
    job_type := 'build_artifact';
    v_job_dedupe_key := document_entity_id::TEXT || ':build_artifact';
  END IF;

  IF job_type IS NOT NULL AND event_id IS NOT NULL THEN
    job_payload := COALESCE(last_event->'payload', '{}'::jsonb)
      || jsonb_build_object('document_entity_id', document_entity_id);

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
      job_type,
      'document',
      document_entity_id,
      document_entity_id,
      job_payload,
      'queued',
      NOW(),
      v_job_dedupe_key
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
  'Canonical events listener (hotfix): witness-scoped dedupe + dedupe_key ambiguity resolved.';
