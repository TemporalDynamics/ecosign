-- Enforce canonical required_evidence on new document.protected.requested events
-- Scope: only NEW appended events (does not invalidate historical rows)
-- Date: 2026-02-16

CREATE OR REPLACE FUNCTION public.enforce_required_evidence_on_protection_request()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_len integer;
  new_len integer;
  idx integer;
  ev jsonb;
  req_evidence jsonb;
BEGIN
  IF NEW.events IS NULL OR jsonb_typeof(NEW.events) <> 'array' THEN
    RETURN NEW;
  END IF;

  old_len := COALESCE(jsonb_array_length(OLD.events), 0);
  new_len := jsonb_array_length(NEW.events);

  -- En append-only updates, only validate newly appended events.
  IF TG_OP = 'UPDATE' AND new_len <= old_len THEN
    RETURN NEW;
  END IF;

  -- For INSERT, validate all events. For UPDATE, validate appended suffix.
  FOR idx IN CASE WHEN TG_OP = 'INSERT' THEN 0 ELSE old_len END .. new_len - 1 LOOP
    ev := NEW.events -> idx;

    IF COALESCE(ev->>'kind', '') = 'document.protected.requested' THEN
      req_evidence := ev->'payload'->'required_evidence';

      IF req_evidence IS NULL OR jsonb_typeof(req_evidence) <> 'array' THEN
        RAISE EXCEPTION
          'document.protected.requested requires payload.required_evidence array (event_index=%)',
          idx;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_required_evidence_on_protection_request ON public.document_entities;

CREATE TRIGGER trg_required_evidence_on_protection_request
BEFORE INSERT OR UPDATE OF events ON public.document_entities
FOR EACH ROW
EXECUTE FUNCTION public.enforce_required_evidence_on_protection_request();

COMMENT ON FUNCTION public.enforce_required_evidence_on_protection_request() IS
  'Rejects new document.protected.requested events missing payload.required_evidence array.';
