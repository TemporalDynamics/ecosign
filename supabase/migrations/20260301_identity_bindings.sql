-- Identity Bindings Table
-- Date: 2026-03-01
-- Purpose: Persistent identity tracking (email → UUID) to handle email changes
-- Constraint: Append-only audit trail for identity verification

BEGIN;

-- Table for identity bindings (persistent person ID across email changes)
CREATE TABLE public.identity_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'merged')),
  verified_at TIMESTAMPTZ,
  merged_into_id UUID REFERENCES identity_bindings(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE UNIQUE INDEX idx_identity_bindings_email ON identity_bindings(email)
  WHERE status = 'active';
CREATE INDEX idx_identity_bindings_created_at ON identity_bindings(created_at DESC);

-- Comments
COMMENT ON TABLE identity_bindings IS
  'Persistent identity binding for tracking persons across email changes. Used by presential verification.';

COMMENT ON COLUMN identity_bindings.email IS
  'Primary email for this identity.';

COMMENT ON COLUMN identity_bindings.verified_at IS
  'Timestamp when identity was verified (e.g., via OTP).';

COMMENT ON COLUMN identity_bindings.merged_into_id IS
  'If two identities are merged, points to the canonical binding.';

COMMIT;
