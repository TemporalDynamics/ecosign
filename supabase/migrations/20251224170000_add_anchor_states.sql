-- Migration: Add anchor_states table for aggregated probative signals
-- Date: 2025-12-22

CREATE TABLE IF NOT EXISTS public.anchor_states (
  project_id TEXT PRIMARY KEY,
  anchor_requested_at TIMESTAMPTZ,
  polygon_confirmed_at TIMESTAMPTZ,
  bitcoin_confirmed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.anchor_states IS
  'Aggregated probative state per project_id (one row per project).';
COMMENT ON COLUMN public.anchor_states.anchor_requested_at IS
  'Timestamp when anchoring was requested for the project (may be updated on re-request).';

-- Enable RLS
ALTER TABLE public.anchor_states ENABLE ROW LEVEL SECURITY;

-- Public can read aggregated state for verification
CREATE POLICY "Public can view anchor states"
  ON public.anchor_states
  FOR SELECT
  USING (true);

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.update_anchor_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS anchor_states_updated_at ON public.anchor_states;

CREATE TRIGGER anchor_states_updated_at
  BEFORE UPDATE ON public.anchor_states
  FOR EACH ROW
  EXECUTE FUNCTION public.update_anchor_states_updated_at();
