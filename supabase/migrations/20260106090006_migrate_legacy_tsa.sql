-- Migration: Legacy TSA to events[]
-- This migration is SAFE and idempotent
-- Currently a NO-OP because no legacy_id column exists yet

-- NOTE: When legacy_id mapping exists, uncomment and adjust the migration below

-- Example migration (COMMENTED OUT - adjust when needed):
/*
DO $$
DECLARE
  legacy_doc RECORD;
  tsa_event jsonb;
BEGIN
  -- Check if legacy_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document_entities' AND column_name = 'legacy_id'
  ) THEN
    RAISE NOTICE 'No legacy_id column found, skipping TSA migration';
    RETURN;
  END IF;

  -- Iterate over legacy documents with TSA
  FOR legacy_doc IN
    SELECT
      de.id AS entity_id,
      de.witness_hash,
      ud.tca_timestamp,
      ud.tca_token
    FROM document_entities de
    JOIN user_documents ud ON ud.id = de.legacy_id
    WHERE ud.tca_timestamp IS NOT NULL
      AND ud.tca_token IS NOT NULL
      AND ud.tca_token != ''
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(de.events) e
        WHERE e->>'kind' = 'tsa'
      )
  LOOP
    -- Build TSA event from legacy data
    tsa_event := jsonb_build_object(
      'kind', 'tsa',
      'at', legacy_doc.tca_timestamp,
      'witness_hash', legacy_doc.witness_hash,
      'tsa', jsonb_build_object(
        'token_b64', legacy_doc.tca_token,
        'gen_time', legacy_doc.tca_timestamp,
        'digest_algo', 'sha256'
      )
    );

    -- Append to events[] (triggers will validate)
    UPDATE document_entities
    SET events = events || jsonb_build_array(tsa_event)
    WHERE id = legacy_doc.entity_id;

    RAISE NOTICE 'Migrated TSA for document %', legacy_doc.entity_id;
  END LOOP;

  RAISE NOTICE 'Legacy TSA migration complete';
END $$;
*/

-- Current status: NO-OP (safe to apply)
SELECT 'Legacy TSA migration placeholder - no action taken' AS status;

-- Step 2: Verify migration
-- Commented out - no migration occurred
-- SELECT
--   id,
--   witness_hash,
--   jsonb_array_length(events) AS event_count,
--   tsa_latest->>'at' AS tsa_timestamp
-- FROM document_entities
-- WHERE tsa_latest IS NOT NULL;

-- Step 3 (MANUAL): If migration successful, consider deprecating legacy columns
-- DO NOT DROP legacy columns immediately - keep for audit/rollback

-- Example cleanup (ONLY after verification):
-- ALTER TABLE user_documents DROP COLUMN tca_timestamp;
-- ALTER TABLE user_documents DROP COLUMN tca_token;
