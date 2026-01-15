-- P2.1 Fase 0.5 — Add batch_id to signature_fields
-- Purpose: Establish formal relationship between fields and batches
-- Author: EcoSign Dev Team
-- Date: 2026-01-15

-- Add batch_id column (nullable for now, will become NOT NULL after backfill)
ALTER TABLE public.workflow_fields
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_workflow_fields_batch_id ON public.workflow_fields(batch_id);

COMMENT ON COLUMN public.workflow_fields.batch_id IS 'P2.1 — Foreign key to batches table. Will be NOT NULL after backfill migration.';
