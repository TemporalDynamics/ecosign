-- Canonicalization for invites/access endpoints.
-- Adds document_entity_id pointers to legacy sharing tables and backfills them.

ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS document_entity_id UUID REFERENCES public.document_entities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_document_entity_id
ON public.documents(document_entity_id);

ALTER TABLE public.links
ADD COLUMN IF NOT EXISTS document_entity_id UUID REFERENCES public.document_entities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_links_document_entity_id
ON public.links(document_entity_id);

ALTER TABLE public.recipients
ADD COLUMN IF NOT EXISTS document_entity_id UUID REFERENCES public.document_entities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recipients_document_entity_id
ON public.recipients(document_entity_id);

ALTER TABLE public.invites
ADD COLUMN IF NOT EXISTS document_entity_id UUID REFERENCES public.document_entities(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_invites_document_entity_id
ON public.invites(document_entity_id);

ALTER TABLE public.signer_links
ADD COLUMN IF NOT EXISTS document_entity_id UUID REFERENCES public.document_entities(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_signer_links_document_entity_id
ON public.signer_links(document_entity_id);

-- Canonical mode allows rows identified only by document_entity_id.
ALTER TABLE public.invites
ALTER COLUMN document_id DROP NOT NULL;

ALTER TABLE public.signer_links
ALTER COLUMN document_id DROP NOT NULL;

-- Backfill from legacy bridge (user_documents -> document_entities).
UPDATE public.documents d
SET document_entity_id = ud.document_entity_id
FROM public.user_documents ud
WHERE d.document_entity_id IS NULL
  AND ud.id = d.id
  AND ud.document_entity_id IS NOT NULL;

UPDATE public.invites i
SET document_entity_id = ud.document_entity_id
FROM public.user_documents ud
WHERE i.document_entity_id IS NULL
  AND i.document_id = ud.id
  AND ud.document_entity_id IS NOT NULL;

UPDATE public.signer_links sl
SET document_entity_id = ud.document_entity_id
FROM public.user_documents ud
WHERE sl.document_entity_id IS NULL
  AND sl.document_id = ud.id
  AND ud.document_entity_id IS NOT NULL;

-- Backfill links/recipients from documents table once it has canonical pointer.
UPDATE public.links l
SET document_entity_id = d.document_entity_id
FROM public.documents d
WHERE l.document_entity_id IS NULL
  AND l.document_id = d.id
  AND d.document_entity_id IS NOT NULL;

UPDATE public.recipients r
SET document_entity_id = d.document_entity_id
FROM public.documents d
WHERE r.document_entity_id IS NULL
  AND r.document_id = d.id
  AND d.document_entity_id IS NOT NULL;
