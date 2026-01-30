-- Migration: Enforce uniqueness for probative events in document_entities.events[]
-- Date: 2026-01-30
-- Purpose: Make TSA + artifact facts unique per document entity.
--
-- Rationale:
-- - jobs are retryable; facts are not.
-- - without DB-level uniqueness, retries can create split-brain histories.

CREATE OR REPLACE FUNCTION enforce_events_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_len integer;
  new_len integer;
  new_event jsonb;
  event_kind text;
  old_has_tsa boolean;
  old_has_artifact boolean;
BEGIN
  -- Check append-only invariant
  old_len := jsonb_array_length(OLD.events);
  new_len := jsonb_array_length(NEW.events);

  IF new_len < old_len THEN
    RAISE EXCEPTION 'events[] is append-only: cannot shrink';
  END IF;

  -- Snapshot prior facts (used for uniqueness enforcement)
  old_has_tsa := jsonb_path_exists(
    OLD.events,
    '$[*] ? (@.kind == "tsa" || @.kind == "tsa.confirmed")'
  );
  old_has_artifact := jsonb_path_exists(
    OLD.events,
    '$[*] ? (@.kind == "artifact.finalized")'
  );

  -- If length increased, validate new events
  IF new_len > old_len THEN
    FOR i IN old_len..(new_len - 1) LOOP
      new_event := NEW.events->i;
      event_kind := new_event->>'kind';

      -- TSA facts are unique per entity
      IF event_kind IN ('tsa', 'tsa.confirmed') THEN
        IF old_has_tsa THEN
          RAISE EXCEPTION 'TSA event is unique per document entity: cannot append % twice', event_kind;
        END IF;
        PERFORM validate_tsa_event(new_event);

        -- witness_hash must match document witness_hash
        IF new_event->>'witness_hash' != NEW.witness_hash THEN
          RAISE EXCEPTION 'TSA event witness_hash (%) must match document witness_hash (%)',
            new_event->>'witness_hash', NEW.witness_hash;
        END IF;

        old_has_tsa := true;
      END IF;

      -- Anchor facts are validated elsewhere (validate_anchor_event + uniqueness per network)
      IF event_kind = 'anchor' THEN
        PERFORM validate_anchor_event(new_event);

        IF new_event->'anchor'->>'witness_hash' != NEW.witness_hash THEN
          RAISE EXCEPTION 'Anchor event witness_hash (%) must match document witness_hash (%)',
            new_event->'anchor'->>'witness_hash', NEW.witness_hash;
        END IF;
      END IF;

      -- Artifact finalization is unique per entity
      IF event_kind = 'artifact.finalized' THEN
        IF old_has_artifact THEN
          RAISE EXCEPTION 'artifact.finalized is unique per document entity';
        END IF;
        old_has_artifact := true;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION enforce_events_append_only() IS
  'Enforces append-only events[] plus probative invariants: TSA unique, TSA/anchor witness_hash consistency, anchor schema, and artifact.finalized uniqueness.';
