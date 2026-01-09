-- ========================================
-- OPERATIONS EVENTS (append-only)
-- Fecha: 2026-01-09
-- ========================================

CREATE TABLE IF NOT EXISTS operations_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  document_entity_id UUID REFERENCES document_entities(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (
    kind IN (
      'operation.created',
      'operation.renamed',
      'operation.archived',
      'operation.closed',
      'operation.document_added',
      'operation.document_removed'
    )
  ),
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor JSONB NOT NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operations_events_operation
  ON operations_events (operation_id, at DESC);

CREATE INDEX IF NOT EXISTS idx_operations_events_kind
  ON operations_events (kind);

CREATE INDEX IF NOT EXISTS idx_operations_events_document
  ON operations_events (document_entity_id);

COMMENT ON TABLE operations_events IS 'Append-only audit log for operation-level events';
COMMENT ON COLUMN operations_events.kind IS 'operation.* event type';
COMMENT ON COLUMN operations_events.at IS 'Canonical event time (UTC)';
COMMENT ON COLUMN operations_events.actor IS 'Actor payload {id,type}';
COMMENT ON COLUMN operations_events.metadata IS 'Optional event metadata';

ALTER TABLE operations_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view operations_events"
  ON operations_events FOR SELECT
  TO authenticated
  USING (
    auth.uid() = (SELECT owner_id FROM operations WHERE id = operation_id)
  );

CREATE POLICY "Owners can insert operations_events"
  ON operations_events FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM operations WHERE id = operation_id)
  );

GRANT SELECT, INSERT ON operations_events TO authenticated;
GRANT ALL ON operations_events TO service_role;
