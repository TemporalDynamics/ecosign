-- Add NDA text to signature workflows
ALTER TABLE IF EXISTS public.signature_workflows
  ADD COLUMN IF NOT EXISTS nda_text TEXT;

COMMENT ON COLUMN public.signature_workflows.nda_text IS
  'Full NDA text presented to signers for this workflow';
