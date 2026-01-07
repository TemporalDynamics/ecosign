-- Link signature workflows to canonical document_entities (optional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'signature_workflows'
      AND column_name = 'document_entity_id'
  ) THEN
    ALTER TABLE public.signature_workflows
      ADD COLUMN document_entity_id UUID
      REFERENCES public.document_entities(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_signature_workflows_document_entity_id
  ON public.signature_workflows(document_entity_id);

COMMENT ON COLUMN public.signature_workflows.document_entity_id IS
  'Optional link to canonical document_entities for evidence events.';
