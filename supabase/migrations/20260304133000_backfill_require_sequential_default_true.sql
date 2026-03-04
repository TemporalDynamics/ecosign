-- Backfill legacy workflows to explicit sequential mode and set default to true

UPDATE public.signature_workflows
SET require_sequential = true
WHERE require_sequential IS NULL OR require_sequential = false;

ALTER TABLE public.signature_workflows
  ALTER COLUMN require_sequential SET DEFAULT true;
