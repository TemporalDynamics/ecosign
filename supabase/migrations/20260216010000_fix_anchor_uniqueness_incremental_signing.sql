-- Fix anchor uniqueness to support incremental signing
-- Old: only 1 anchor per network per document
-- New: 1 anchor.confirmed per (witness_hash, network, anchor_stage, step_index)
-- Note: anchor.submitted and anchor.failed are NOT subject to uniqueness (they can repeat)

-- Drop old trigger
DROP TRIGGER IF EXISTS trg_anchor_network_unique ON document_entities;

-- Create new improved validation function
-- Only anchor.confirmed is subject to uniqueness (that's the definitive proof)
CREATE OR REPLACE FUNCTION validate_anchor_uniqueness()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  anchor_record RECORD;
  duplicate_count INT;
BEGIN
  -- For each anchor.confirmed event in the new events array
  -- Only anchor.confirmed is definitive proof - submitted/failed can repeat
  FOR anchor_record IN 
    SELECT e->>'kind' as kind,
           e->'anchor'->>'network' as network,
           e->'anchor'->>'witness_hash' as witness_hash,
           COALESCE(e->'anchor'->>'anchor_stage', 'initial') as anchor_stage,
           COALESCE(e->'anchor'->>'step_index', 0) as step_index
    FROM jsonb_array_elements(NEW.events) e
    WHERE e->>'kind' = 'anchor.confirmed'
  LOOP
    -- Check for duplicates: same witness_hash + network + anchor_stage + step_index
    SELECT COUNT(*) INTO duplicate_count
    FROM jsonb_array_elements(NEW.events) e2
    WHERE e2->>'kind' = 'anchor.confirmed'
      AND e2->'anchor'->>'network' = anchor_record.network
      AND COALESCE(e2->'anchor'->>'witness_hash', '') = COALESCE(anchor_record.witness_hash, '')
      AND COALESCE(e2->'anchor'->>'anchor_stage', 'initial') = anchor_record.anchor_stage
      AND COALESCE(e2->'anchor'->>'step_index', 0)::int = anchor_record.step_index::int;

    IF duplicate_count > 1 THEN
      RAISE EXCEPTION 'Duplicate anchor.confirmed detected: witness_hash=%, network=%, stage=%, step=% (found %)',
        anchor_record.witness_hash, anchor_record.network, anchor_record.anchor_stage, 
        anchor_record.step_index, duplicate_count;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create new trigger
CREATE TRIGGER trg_anchor_network_unique
BEFORE INSERT OR UPDATE OF events ON document_entities
FOR EACH ROW
EXECUTE FUNCTION validate_anchor_uniqueness();

COMMENT ON FUNCTION validate_anchor_uniqueness() IS 
  'Enforces anchor.confirmed uniqueness: max 1 confirmed anchor per (witness_hash, network, anchor_stage, step_index). '
  'anchor.submitted and anchor.failed can repeat (they are not definitive proofs). '
  'Supports incremental signing where multiple anchors can exist for different witness hashes.';
