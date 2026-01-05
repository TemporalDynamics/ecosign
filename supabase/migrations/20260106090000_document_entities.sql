-- Canonical document entities (v2)
CREATE TABLE document_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  source_name TEXT NOT NULL,
  source_mime TEXT NOT NULL,
  source_size BIGINT NOT NULL,
  source_hash TEXT NOT NULL,
  source_captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_storage_path TEXT,

  custody_mode TEXT NOT NULL CHECK (custody_mode IN ('hash_only', 'encrypted_custody')),
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN (
    'protected',
    'needs_witness',
    'witness_ready',
    'in_signature_flow',
    'signed',
    'anchored',
    'revoked',
    'archived'
  )),

  witness_current_hash TEXT,
  witness_current_mime TEXT,
  witness_current_status TEXT CHECK (witness_current_status IN ('generated', 'signed')),
  witness_current_storage_path TEXT,
  witness_current_generated_at TIMESTAMPTZ,
  witness_history JSONB NOT NULL DEFAULT '[]'::jsonb,

  witness_hash TEXT,
  signed_hash TEXT,
  composite_hash TEXT,
  hash_chain JSONB NOT NULL DEFAULT '{}'::jsonb,
  transform_log JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT document_entities_source_hash_unique UNIQUE (owner_id, source_hash),
  CONSTRAINT document_entities_hash_chain_is_object CHECK (jsonb_typeof(hash_chain) = 'object'),
  CONSTRAINT document_entities_transform_log_is_array CHECK (jsonb_typeof(transform_log) = 'array'),
  CONSTRAINT document_entities_witness_history_is_array CHECK (jsonb_typeof(witness_history) = 'array'),
  CONSTRAINT document_entities_witness_mime_pdf CHECK (
    witness_current_mime IS NULL OR witness_current_mime = 'application/pdf'
  ),
  CONSTRAINT document_entities_witness_hash_consistent CHECK (
    witness_current_hash IS NULL OR witness_hash = witness_current_hash
  ),
  CONSTRAINT document_entities_custody_storage_consistent CHECK (
    (custody_mode = 'hash_only' AND source_storage_path IS NULL)
    OR (custody_mode = 'encrypted_custody' AND source_storage_path IS NOT NULL)
  )
);

CREATE INDEX idx_document_entities_owner_created_at
  ON document_entities (owner_id, created_at DESC);

CREATE INDEX idx_document_entities_witness_hash
  ON document_entities (witness_hash);
