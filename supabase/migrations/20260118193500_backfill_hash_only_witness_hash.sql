-- Backfill witness_hash for existing hash_only documents
UPDATE public.document_entities
SET witness_hash = source_hash,
    hash_chain = jsonb_set(
      COALESCE(hash_chain, '{}'::jsonb),
      '{witness_hash}',
      to_jsonb(source_hash),
      true
    )
WHERE custody_mode = 'hash_only'
  AND (witness_hash IS NULL OR witness_hash = '');
