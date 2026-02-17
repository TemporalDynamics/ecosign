-- Add document_entity_id to user_documents for projection trigger
-- This column links user_documents to document_entities (source of truth)

ALTER TABLE public.user_documents
ADD COLUMN IF NOT EXISTS document_entity_id UUID REFERENCES public.document_entities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_documents_entity_id
  ON public.user_documents(document_entity_id)
  WHERE document_entity_id IS NOT NULL;

COMMENT ON COLUMN public.user_documents.document_entity_id IS
  'Reference to document_entities (source of truth). Populated/maintained by projection trigger.';
