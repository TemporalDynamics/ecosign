-- Presential Verification Layer
-- Date: 2026-03-01
-- Purpose: Optional identity confirmation layer via presential sessions
-- Constraint: Does not modify digital signature validity or core architecture

BEGIN;

-- New table: presential_verification_sessions
CREATE TABLE public.presential_verification_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,  -- Format: "PSV-ABC123"
  qr_code TEXT,                     -- Base64 or URL
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed', 'expired')),
  snapshot_hash TEXT NOT NULL,      -- SHA-256 of snapshot_data
  snapshot_data JSONB NOT NULL,     -- Documents + signers + captured state
  confirmations JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Signer confirmations by ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX idx_presential_operation_id ON presential_verification_sessions(operation_id);
CREATE INDEX idx_presential_session_id ON presential_verification_sessions(session_id);
CREATE INDEX idx_presential_status ON presential_verification_sessions(status)
  WHERE status = 'active';
CREATE INDEX idx_presential_created_at ON presential_verification_sessions(created_at DESC);

-- Comments
COMMENT ON TABLE presential_verification_sessions IS
  'Presential verification sessions. Optional layer for identity confirmation. Does not affect digital signature validity.';

COMMENT ON COLUMN presential_verification_sessions.session_id IS
  'Unique short identifier for session (PSV-XXXXX format).';

COMMENT ON COLUMN presential_verification_sessions.snapshot_hash IS
  'SHA-256 hash of snapshot_data for integrity verification.';

COMMENT ON COLUMN presential_verification_sessions.snapshot_data IS
  'JSONB snapshot containing operation documents, signers, and state at session creation.';

COMMENT ON COLUMN presential_verification_sessions.confirmations IS
  'JSONB object mapping signer_id → {confirmedAt, method, identityBindingId}.';

COMMIT;
