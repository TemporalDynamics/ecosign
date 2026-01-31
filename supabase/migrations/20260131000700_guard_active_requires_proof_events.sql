-- Migration: Guard ACTIVE protection_level requires proof events
-- Date: 2026-01-31
-- Purpose:
-- Prevent silent corruption where user_documents.protection_level becomes 'ACTIVE'
-- without a canonical proof trail in document_entities.events[].
--
-- Invariant:
-- If protection_level = 'ACTIVE' then the linked document_entities row must exist and
-- must contain at least:
--   - protection_enabled
--   - document.protected.requested

CREATE OR REPLACE FUNCTION public.enforce_active_requires_proof_events()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  has_protection_enabled boolean;
  has_protection_requested boolean;
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
    jsonb_path_exists(COALESCE(de.events, '[]'::jsonb), '$[*] ? (@.kind == "protection_enabled")'),
    jsonb_path_exists(COALESCE(de.events, '[]'::jsonb), '$[*] ? (@.kind == "document.protected.requested")')
  INTO has_protection_enabled, has_protection_requested
  FROM public.document_entities de
  WHERE de.id = NEW.document_entity_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'protection_level=ACTIVE requires existing document_entities row (document_entity_id=%, user_document_id=%)',
      NEW.document_entity_id, NEW.id;
  END IF;

  IF NOT has_protection_enabled OR NOT has_protection_requested THEN
    RAISE EXCEPTION 'protection_level=ACTIVE requires proof events (protection_enabled=% document.protected.requested=%) for document_entity_id=% user_document_id=%',
      has_protection_enabled, has_protection_requested, NEW.document_entity_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_active_requires_proof_events() IS
  'Rejects inserts/updates that set protection_level=ACTIVE without required canonical proof events in document_entities.events[]';

DROP TRIGGER IF EXISTS trg_user_documents_active_requires_proof ON public.user_documents;

CREATE TRIGGER trg_user_documents_active_requires_proof
BEFORE INSERT OR UPDATE OF protection_level, document_entity_id
ON public.user_documents
FOR EACH ROW
EXECUTE FUNCTION public.enforce_active_requires_proof_events();
