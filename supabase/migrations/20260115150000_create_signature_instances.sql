-- P2.2 — Create signature_instances table
-- Purpose: Store captured signatures (one per signer per batch)
-- Author: EcoSign Dev Team
-- Date: 2026-01-15

-- Table: signature_instances
-- One signature captured once, applied to multiple fields
CREATE TABLE IF NOT EXISTS public.signature_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  workflow_id UUID NOT NULL REFERENCES public.signature_workflows(id) ON DELETE CASCADE,
  document_entity_id UUID NOT NULL REFERENCES public.document_entities(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL REFERENCES public.workflow_signers(id) ON DELETE CASCADE,
  
  signature_payload JSONB NOT NULL,
  -- Contains: strokes, vector data, crypto proof, metadata
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Invariant: one signature per signer per batch
  UNIQUE (batch_id, signer_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_signature_instances_workflow 
  ON public.signature_instances(workflow_id);

CREATE INDEX IF NOT EXISTS idx_signature_instances_document 
  ON public.signature_instances(document_entity_id);

CREATE INDEX IF NOT EXISTS idx_signature_instances_batch_signer 
  ON public.signature_instances(batch_id, signer_id);

-- RLS policies (if needed)
ALTER TABLE public.signature_instances ENABLE ROW LEVEL SECURITY;

-- Allow signers to read their own signatures
CREATE POLICY signature_instances_read_own
  ON public.signature_instances
  FOR SELECT
  USING (
    signer_id IN (
      SELECT id FROM public.workflow_signers
      WHERE workflow_signers.email = current_setting('request.jwt.claims')::json->>'email'
    )
  );

-- Allow authenticated users to insert (will be validated by application logic)
CREATE POLICY signature_instances_insert
  ON public.signature_instances
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
