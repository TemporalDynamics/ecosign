-- Fix trigger WHEN clause to handle NULL events
DROP TRIGGER IF EXISTS trg_project_events_to_user_document ON document_entities;

CREATE TRIGGER trg_project_events_to_user_document
  AFTER UPDATE OF events ON document_entities
  FOR EACH ROW
  WHEN (
    COALESCE(jsonb_array_length(NEW.events), 0) > COALESCE(jsonb_array_length(OLD.events), 0)
  )
  EXECUTE FUNCTION project_events_to_user_document();
