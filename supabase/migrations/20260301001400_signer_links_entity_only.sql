-- Allow canonical signer link flows to operate only with document_entity_id.
-- Legacy document_id pointer becomes optional for signer_links.

ALTER TABLE public.signer_links
ALTER COLUMN document_id DROP NOT NULL;
