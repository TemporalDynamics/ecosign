-- P2.1 Fase 0.5 — Create batches table
-- Purpose: Formalize batch concept for field grouping and signer assignment
-- Author: EcoSign Dev Team
-- Date: 2026-01-15

-- Table: batches
-- Stores logical groups of signature fields that are assigned together to a single signer
CREATE TABLE IF NOT EXISTS public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_entity_id UUID NOT NULL REFERENCES public.document_entities(id) ON DELETE CASCADE,
  label TEXT,
  "order" INT DEFAULT 0,
  assigned_signer_id UUID REFERENCES public.workflow_signers(id) ON DELETE SET NULL,
  origin TEXT DEFAULT 'user_created' CHECK (origin IN ('user_created', 'legacy_backfill')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_batches_document_entity_id ON public.batches(document_entity_id);
CREATE INDEX IF NOT EXISTS idx_batches_assigned_signer_id ON public.batches(assigned_signer_id);

-- RLS policies
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

-- Owner can manage batches of their documents
CREATE POLICY "Users can manage batches of their documents" ON public.batches
  FOR ALL
  USING (
    document_entity_id IN (
      SELECT id FROM public.document_entities WHERE owner_id = auth.uid()
    )
  );

-- Trigger: updated_at
CREATE TRIGGER set_batches_updated_at
  BEFORE UPDATE ON public.batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.batches IS 'P2.1 — Logical groups of signature fields assigned to a single signer';
COMMENT ON COLUMN public.batches.origin IS 'Tracks whether batch was user-created or generated during legacy backfill';
