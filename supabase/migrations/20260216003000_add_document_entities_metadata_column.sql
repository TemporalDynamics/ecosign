-- Ensure document_entities.metadata exists for evidence generation and future extensibility.
-- Safe in production and idempotent across environments.

ALTER TABLE public.document_entities
ADD COLUMN IF NOT EXISTS metadata jsonb;

UPDATE public.document_entities
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

