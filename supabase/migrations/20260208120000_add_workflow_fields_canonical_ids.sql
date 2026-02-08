-- Add canonical field identity + signer assignment for CAI readiness

ALTER TABLE public.workflow_fields
  ADD COLUMN IF NOT EXISTS external_field_id UUID;

ALTER TABLE public.workflow_fields
  ADD COLUMN IF NOT EXISTS assigned_signer_id UUID REFERENCES public.workflow_signers(id) ON DELETE SET NULL;

-- Backfill canonical IDs for existing fields (one-time)
UPDATE public.workflow_fields
SET external_field_id = gen_random_uuid()
WHERE external_field_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_fields_external_field_id
  ON public.workflow_fields(external_field_id);

CREATE INDEX IF NOT EXISTS idx_workflow_fields_assigned_signer_id
  ON public.workflow_fields(assigned_signer_id)
  WHERE assigned_signer_id IS NOT NULL;

COMMENT ON COLUMN public.workflow_fields.external_field_id IS
  'Canonical logical identity for hashing. Stable across resaves.';

COMMENT ON COLUMN public.workflow_fields.assigned_signer_id IS
  'Canonical signer assignment (UUID). Email remains for UX only.';
