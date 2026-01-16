-- Allow source_storage_path for hash_only custody mode
-- Keeps requirement for encrypted_custody while permitting hash_only to store encrypted originals

ALTER TABLE document_entities
  DROP CONSTRAINT IF EXISTS document_entities_custody_storage_consistent;

ALTER TABLE document_entities
  ADD CONSTRAINT document_entities_custody_storage_consistent CHECK (
    custody_mode = 'hash_only'
    OR source_storage_path IS NOT NULL
  );
