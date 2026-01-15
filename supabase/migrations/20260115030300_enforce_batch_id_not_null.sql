-- P2.1 Fase 0.5 — Make batch_id NOT NULL
-- Purpose: Enforce P2.1 R1 - Every field MUST belong to a batch
-- Author: EcoSign Dev Team
-- Date: 2026-01-15
-- Prerequisite: Backfill migration must have run successfully

-- Final constraint: batch_id is now mandatory
ALTER TABLE public.workflow_fields
ALTER COLUMN batch_id SET NOT NULL;

COMMENT ON COLUMN public.workflow_fields.batch_id IS 'P2.1 R1 — Every field belongs to exactly one batch (NOT NULL enforced)';
