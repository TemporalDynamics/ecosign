-- Canonicalize share runtime pointers by document_entity_id.
-- - Adds document_shares.document_entity_id as canonical reference
-- - Backfills existing shares from user_documents linkage
-- - Backfills document_entities.metadata.ecox.runtime from latest encrypted legacy rows

ALTER TABLE public.document_shares
ADD COLUMN IF NOT EXISTS document_entity_id UUID REFERENCES public.document_entities(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_document_shares_document_entity_id
ON public.document_shares(document_entity_id);

UPDATE public.document_shares ds
SET document_entity_id = ud.document_entity_id
FROM public.user_documents ud
WHERE ds.document_entity_id IS NULL
  AND ud.id = ds.document_id
  AND ud.document_entity_id IS NOT NULL;

WITH latest_runtime AS (
  SELECT DISTINCT ON (ud.document_entity_id)
    ud.document_entity_id,
    ud.encrypted_path,
    ud.wrapped_key,
    ud.wrap_iv
  FROM public.user_documents ud
  WHERE ud.document_entity_id IS NOT NULL
    AND ud.encrypted_path IS NOT NULL
  ORDER BY ud.document_entity_id, COALESCE(ud.updated_at, ud.created_at) DESC NULLS LAST
)
UPDATE public.document_entities de
SET metadata = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          COALESCE(de.metadata, '{}'::jsonb),
          '{ecox,runtime,encrypted_path}',
          to_jsonb(lr.encrypted_path),
          true
        ),
        '{ecox,runtime,wrapped_key}',
        to_jsonb(lr.wrapped_key),
        true
      ),
      '{ecox,runtime,wrap_iv}',
      to_jsonb(lr.wrap_iv),
      true
    ),
    '{ecox,runtime,storage_bucket}',
    to_jsonb('user-documents'::text),
    true
  ),
  '{ecox,runtime,updated_at}',
  to_jsonb(NOW()),
  true
)
FROM latest_runtime lr
WHERE de.id = lr.document_entity_id;
