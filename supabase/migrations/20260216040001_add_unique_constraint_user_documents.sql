-- Add unique constraint for document_entity_id (safe/idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_documents_document_entity_id_unique'
      AND conrelid = 'public.user_documents'::regclass
  ) THEN
    ALTER TABLE public.user_documents
      ADD CONSTRAINT user_documents_document_entity_id_unique UNIQUE (document_entity_id);
  END IF;
END $$;
