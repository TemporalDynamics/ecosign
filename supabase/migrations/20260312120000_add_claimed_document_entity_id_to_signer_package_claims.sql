ALTER TABLE public.signer_package_claims
ADD COLUMN IF NOT EXISTS claimed_document_entity_id UUID REFERENCES public.document_entities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS signer_package_claims_claimed_document_entity_id_idx
  ON public.signer_package_claims (claimed_document_entity_id);
