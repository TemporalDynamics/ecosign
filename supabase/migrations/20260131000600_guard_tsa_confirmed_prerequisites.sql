-- Migration: Guard TSA evidence prerequisites and authority
-- Date: 2026-01-31
-- Purpose:
-- 1) Enforce causal order: TSA evidence must not exist without a prior request.
-- 2) Enforce authority: only run-tsa may emit tsa.confirmed into document_entities.events[].
--
-- Rationale:
-- - Network races / alternate writers can cause tsa.confirmed to be appended before
--   document.protected.requested. This breaks the canonical story even if the proof is valid.
-- - We want TSA to be produced only via the job pipeline (run_tsa -> run-tsa).

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
  old_has_protection_request boolean;
  event_source text;
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
  old_has_protection_request := jsonb_path_exists(
    OLD.events,
    '$[*] ? (@.kind == "document.protected.requested")'
  );

  -- If length increased, validate new events
  IF new_len > old_len THEN
    FOR i IN old_len..(new_len - 1) LOOP
      new_event := NEW.events->i;
      event_kind := new_event->>'kind';
      event_source := new_event->>'_source';

      -- TSA facts are unique per entity
      IF event_kind IN ('tsa', 'tsa.confirmed') THEN
        -- Causal guard: TSA evidence requires an explicit protection request beforehand.
        IF NOT old_has_protection_request THEN
          RAISE EXCEPTION 'TSA evidence requires prior document.protected.requested';
        END IF;

        -- Authority guard: only run-tsa may emit tsa.confirmed.
        IF event_kind = 'tsa.confirmed' AND event_source IS DISTINCT FROM 'run-tsa' THEN
          RAISE EXCEPTION 'tsa.confirmed must be emitted by run-tsa (got source=%)', COALESCE(event_source, 'NULL');
        END IF;

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
  'Enforces append-only events[] plus probative invariants: TSA unique, TSA requires prior request, TSA source=run-tsa, TSA/anchor witness_hash consistency, anchor schema, and artifact.finalized uniqueness.';
