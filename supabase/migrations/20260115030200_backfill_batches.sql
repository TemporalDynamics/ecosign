-- P2.1 Fase 0.5 — Backfill batches for existing workflow_fields
-- Purpose: Create default batches for fields without batch_id
-- Strategy: Conservative backfill - 1 field = 1 batch (no spatial inference)
-- Author: EcoSign Dev Team
-- Date: 2026-01-15

-- Backfill function
-- Creates one batch per field that doesn't have a batch_id yet
-- Respects existing batches (from duplicar batch / duplicar en todas las hojas)
CREATE OR REPLACE FUNCTION public.backfill_workflow_field_batches()
RETURNS TABLE(fields_processed INT, batches_created INT) AS $$
DECLARE
  v_fields_processed INT := 0;
  v_batches_created INT := 0;
  v_field RECORD;
  v_new_batch_id UUID;
BEGIN
  -- Process all fields without batch_id
  FOR v_field IN 
    SELECT id, document_entity_id 
    FROM public.workflow_fields 
    WHERE batch_id IS NULL
  LOOP
    -- Create a new batch for this field
    INSERT INTO public.batches (document_entity_id, origin, created_at, updated_at)
    VALUES (v_field.document_entity_id, 'legacy_backfill', now(), now())
    RETURNING id INTO v_new_batch_id;
    
    -- Assign field to the new batch
    UPDATE public.workflow_fields
    SET batch_id = v_new_batch_id
    WHERE id = v_field.id;
    
    v_fields_processed := v_fields_processed + 1;
    v_batches_created := v_batches_created + 1;
  END LOOP;
  
  RETURN QUERY SELECT v_fields_processed, v_batches_created;
END;
$$ LANGUAGE plpgsql;

-- Execute backfill
SELECT * FROM public.backfill_workflow_field_batches();

-- Cleanup function (optional, for safety)
DROP FUNCTION IF EXISTS public.backfill_workflow_field_batches();

COMMENT ON TABLE public.batches IS 'P2.1 — Backfill completed. All workflow_fields now have batch_id.';
