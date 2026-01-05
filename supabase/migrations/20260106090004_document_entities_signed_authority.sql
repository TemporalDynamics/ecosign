ALTER TABLE document_entities
  ADD COLUMN signed_authority TEXT,
  ADD COLUMN signed_authority_ref JSONB;

ALTER TABLE document_entities
  ADD CONSTRAINT document_entities_signed_authority_check
  CHECK (
    signed_authority IS NULL
    OR signed_authority IN ('internal', 'external')
  );
