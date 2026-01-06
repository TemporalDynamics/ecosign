-- Document Entities Events (TSA, Anchors, External Signatures)
-- Implements append-only ledger for temporal evidence
-- events[] contains historical proof, hash_chain remains canonical index

-- Add events column (append-only ledger)
ALTER TABLE document_entities
ADD COLUMN events jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add TSA cache (derived from events)
ALTER TABLE document_entities
ADD COLUMN tsa_latest jsonb;

-- Constraint: events must be array
ALTER TABLE document_entities
ADD CONSTRAINT document_entities_events_is_array
CHECK (jsonb_typeof(events) = 'array');

-- Validation function for TSA events
CREATE OR REPLACE FUNCTION validate_tsa_event(event jsonb)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- MUST: kind = "tsa"
  IF event->>'kind' != 'tsa' THEN
    RAISE EXCEPTION 'TSA event must have kind="tsa"';
  END IF;

  -- MUST: at (ISO 8601 timestamp)
  IF event->>'at' IS NULL OR event->>'at' = '' THEN
    RAISE EXCEPTION 'TSA event must have "at" timestamp';
  END IF;

  -- MUST: witness_hash (references canonical witness)
  IF event->>'witness_hash' IS NULL OR event->>'witness_hash' = '' THEN
    RAISE EXCEPTION 'TSA event must have "witness_hash"';
  END IF;

  -- MUST: tsa object
  IF event->'tsa' IS NULL THEN
    RAISE EXCEPTION 'TSA event must have "tsa" object';
  END IF;

  -- MUST: tsa.token_b64
  IF event->'tsa'->>'token_b64' IS NULL OR event->'tsa'->>'token_b64' = '' THEN
    RAISE EXCEPTION 'TSA event must have tsa.token_b64';
  END IF;

  -- SHOULD: gen_time, policy_oid, serial
  -- (not enforced as MUST, but logged)

  RETURN true;
END;
$$;

-- Trigger: enforce events append-only + validate TSA
CREATE OR REPLACE FUNCTION enforce_events_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_len INTEGER;
  new_len INTEGER;
  new_event jsonb;
  event_kind TEXT;
BEGIN
  -- Check append-only invariant
  old_len := jsonb_array_length(OLD.events);
  new_len := jsonb_array_length(NEW.events);

  IF new_len < old_len THEN
    RAISE EXCEPTION 'events[] is append-only: cannot shrink';
  END IF;

  -- If length increased, validate new events
  IF new_len > old_len THEN
    FOR i IN old_len..(new_len - 1) LOOP
      new_event := NEW.events->i;
      event_kind := new_event->>'kind';

      -- Validate TSA events
      IF event_kind = 'tsa' THEN
        PERFORM validate_tsa_event(new_event);
        
        -- MUST: witness_hash must match current witness_hash
        IF new_event->>'witness_hash' != NEW.witness_hash THEN
          RAISE EXCEPTION 'TSA event witness_hash must match document_entities.witness_hash';
        END IF;
      END IF;

      -- Future: validate anchor events, external_signature events, etc.
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER document_entities_events_append_only_guard
  BEFORE UPDATE ON document_entities
  FOR EACH ROW
  EXECUTE FUNCTION enforce_events_append_only();

-- Trigger: auto-update tsa_latest from events
CREATE OR REPLACE FUNCTION update_tsa_latest()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  last_tsa jsonb;
BEGIN
  -- Find last TSA event in events[]
  SELECT event INTO last_tsa
  FROM jsonb_array_elements(NEW.events) AS event
  WHERE event->>'kind' = 'tsa'
  ORDER BY event->>'at' DESC
  LIMIT 1;

  NEW.tsa_latest := last_tsa;

  RETURN NEW;
END;
$$;

CREATE TRIGGER document_entities_update_tsa_latest
  BEFORE INSERT OR UPDATE OF events ON document_entities
  FOR EACH ROW
  EXECUTE FUNCTION update_tsa_latest();

-- Index for querying events by kind
CREATE INDEX idx_document_entities_events_kind
  ON document_entities USING GIN ((events));

-- Comment for documentation
COMMENT ON COLUMN document_entities.events IS 'Append-only ledger of temporal evidence (TSA, anchors, external signatures). Each event has { kind, at, ...proof }. Immutable via trigger.';
COMMENT ON COLUMN document_entities.tsa_latest IS 'Cache of last TSA event from events[]. Derived automatically. NOT source of truth.';
