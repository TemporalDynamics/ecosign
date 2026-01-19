-- Auto-derive witness_hash for hash_only documents at insert time
CREATE OR REPLACE FUNCTION public.set_hash_only_witness_hash()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.custody_mode = 'hash_only' THEN
    IF NEW.witness_hash IS NULL OR NEW.witness_hash = '' THEN
      NEW.witness_hash := NEW.source_hash;
    END IF;

    -- Keep hash_chain consistent with the derived witness_hash
    IF NEW.hash_chain IS NULL OR jsonb_typeof(NEW.hash_chain) <> 'object' THEN
      NEW.hash_chain := '{}'::jsonb;
    END IF;
    NEW.hash_chain := jsonb_set(
      NEW.hash_chain,
      '{witness_hash}',
      to_jsonb(NEW.witness_hash),
      true
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER document_entities_hash_only_witness_hash
BEFORE INSERT ON public.document_entities
FOR EACH ROW
EXECUTE FUNCTION public.set_hash_only_witness_hash();
