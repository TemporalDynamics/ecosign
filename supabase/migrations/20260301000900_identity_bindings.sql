-- Identity Bindings Table
-- Date: 2026-03-01
-- Purpose: Persistent identity tracking (email → UUID) to handle email changes
-- Constraint: Append-only audit trail for identity verification

BEGIN;

-- Table for identity bindings (persistent person ID across email changes)
-- Idempotent guards are required because some environments may already contain this table.
CREATE TABLE IF NOT EXISTS public.identity_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  verified_at TIMESTAMPTZ,
  merged_into_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.identity_bindings
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS merged_into_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.identity_bindings
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.identity_bindings'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.identity_bindings
      ADD CONSTRAINT identity_bindings_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.identity_bindings'::regclass
      AND conname = 'identity_bindings_status_check'
  ) THEN
    ALTER TABLE public.identity_bindings
      ADD CONSTRAINT identity_bindings_status_check
      CHECK (status IN ('active', 'inactive', 'merged'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'public.identity_bindings'::regclass
      AND c.contype = 'f'
      AND a.attname = 'merged_into_id'
  ) THEN
    ALTER TABLE public.identity_bindings
      ADD CONSTRAINT identity_bindings_merged_into_id_fkey
      FOREIGN KEY (merged_into_id)
      REFERENCES public.identity_bindings(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- Indices
CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_bindings_email ON identity_bindings(email)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_identity_bindings_created_at ON identity_bindings(created_at DESC);

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
