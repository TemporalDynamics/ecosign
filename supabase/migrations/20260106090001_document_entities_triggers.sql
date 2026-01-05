-- updated_at trigger
CREATE TRIGGER update_document_entities_updated_at
  BEFORE UPDATE ON document_entities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- immutability guard
CREATE OR REPLACE FUNCTION enforce_document_entities_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'owner_id is immutable';
  END IF;

  IF NEW.source_hash IS DISTINCT FROM OLD.source_hash THEN
    RAISE EXCEPTION 'source_hash is immutable';
  END IF;

  IF NEW.source_mime IS DISTINCT FROM OLD.source_mime THEN
    RAISE EXCEPTION 'source_mime is immutable';
  END IF;

  IF NEW.source_size IS DISTINCT FROM OLD.source_size THEN
    RAISE EXCEPTION 'source_size is immutable';
  END IF;

  IF NEW.custody_mode IS DISTINCT FROM OLD.custody_mode THEN
    RAISE EXCEPTION 'custody_mode is immutable';
  END IF;

  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'created_at is immutable';
  END IF;

  IF NEW.source_captured_at IS DISTINCT FROM OLD.source_captured_at THEN
    RAISE EXCEPTION 'source_captured_at is immutable';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER document_entities_immutability_guard
  BEFORE UPDATE ON document_entities
  FOR EACH ROW
  EXECUTE FUNCTION enforce_document_entities_immutability();

-- append-only guard
CREATE OR REPLACE FUNCTION enforce_document_entities_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_log_len INTEGER;
  new_log_len INTEGER;
  old_witness_len INTEGER;
  new_witness_len INTEGER;
BEGIN
  old_log_len := jsonb_array_length(OLD.transform_log);
  new_log_len := jsonb_array_length(NEW.transform_log);

  IF new_log_len < old_log_len THEN
    RAISE EXCEPTION 'transform_log is append-only';
  END IF;

  old_witness_len := jsonb_array_length(OLD.witness_history);
  new_witness_len := jsonb_array_length(NEW.witness_history);

  IF new_witness_len < old_witness_len THEN
    RAISE EXCEPTION 'witness_history is append-only';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER document_entities_append_only_guard
  BEFORE UPDATE ON document_entities
  FOR EACH ROW
  EXECUTE FUNCTION enforce_document_entities_append_only();
