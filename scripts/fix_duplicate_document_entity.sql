-- Fix duplicate document_entity_id in user_documents
-- Keep the most recently updated one for each document_entity_id

-- Step 1: Find duplicates
SELECT document_entity_id, COUNT(*) as count
FROM user_documents
WHERE document_entity_id IS NOT NULL
GROUP BY document_entity_id
HAVING COUNT(*) > 1;

-- Step 2: Delete duplicates (keep most recent)
DELETE FROM user_documents a
USING user_documents b
WHERE a.document_entity_id = b.document_entity_id
  AND a.updated_at < b.updated_at;

-- Step 3: Add unique constraint
ALTER TABLE user_documents
ADD CONSTRAINT user_documents_document_entity_id_unique UNIQUE (document_entity_id);
