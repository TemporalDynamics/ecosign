-- Migration: Add document_entity_id to user_documents
-- Created: 2026-01-06
-- Priority: P0 (SCHEMA LINK - Required for canonical migration)
--
-- Purpose: Link legacy user_documents to canonical document_entities
-- This enables:
-- 1. Workers to append events to document_entities.events[]
-- 2. Detection of dual-write inconsistencies (P0.3)
-- 3. Gradual migration from legacy to canonical schema

-- ============================================================================
-- 1. ADD COLUMN (nullable for backward compatibility)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_documents'
      AND column_name = 'document_entity_id'
  ) THEN
    ALTER TABLE user_documents
      ADD COLUMN document_entity_id UUID
      REFERENCES document_entities(id)
      ON DELETE SET NULL;

    RAISE NOTICE '✅ Added user_documents.document_entity_id column';
  ELSE
    RAISE NOTICE 'ℹ️  user_documents.document_entity_id already exists';
  END IF;
END $$;

-- ============================================================================
-- 2. CREATE INDEX
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_documents_document_entity_id
  ON user_documents(document_entity_id);

-- ============================================================================
-- 3. POPULATE FOR EXISTING DOCUMENTS (optional, based on hash matching)
-- ============================================================================

-- NOTE: This section is COMMENTED OUT because we need to understand the
-- existing data relationship first. Uncomment and adjust as needed.

/*
DO $$
DECLARE
  matched_count INTEGER := 0;
BEGIN
  -- Match user_documents to document_entities by document_hash = witness_hash
  UPDATE user_documents ud
  SET document_entity_id = de.id
  FROM document_entities de
  WHERE ud.document_hash = de.witness_hash
    AND ud.document_entity_id IS NULL;

  GET DIAGNOSTICS matched_count = ROW_COUNT;

  RAISE NOTICE '✅ Linked % existing user_documents to document_entities', matched_count;
END $$;
*/

-- ============================================================================
-- 4. DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN user_documents.document_entity_id IS
  'Link to canonical document_entities table. Used for dual-write migration: '
  'workers update legacy tables AND append to document_entities.events[]. '
  'NULL for legacy documents created before canonical migration. '
  'Future: All new documents must have this set.';

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
DECLARE
  total_docs BIGINT;
  linked_docs BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_docs FROM user_documents;
  SELECT COUNT(*) INTO linked_docs FROM user_documents WHERE document_entity_id IS NOT NULL;

  RAISE NOTICE '✅ Migration complete: user_documents.document_entity_id added';
  RAISE NOTICE 'Total user_documents: %', total_docs;
  RAISE NOTICE 'Linked to document_entities: %', linked_docs;

  IF linked_docs = 0 THEN
    RAISE NOTICE 'ℹ️  No documents linked yet (expected for fresh migration)';
    RAISE NOTICE 'New documents will be linked automatically by workers';
  END IF;
END $$;
