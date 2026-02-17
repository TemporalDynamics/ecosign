-- Add document_entity_id column to anchors table if not exists
-- Required for canonical event emission in process-*-anchors workers

ALTER TABLE anchors
ADD COLUMN IF NOT EXISTS document_entity_id UUID REFERENCES document_entities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_anchors_document_entity_id ON anchors(document_entity_id) WHERE document_entity_id IS NOT NULL;

COMMENT ON COLUMN anchors.document_entity_id IS 'Reference to document_entities for canonical event emission. Populated on anchor creation.';
