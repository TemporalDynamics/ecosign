-- Allow canonical share flows to operate only with document_entity_id.
-- Legacy document_id pointer becomes optional for links/recipients.

ALTER TABLE public.links
ALTER COLUMN document_id DROP NOT NULL;

ALTER TABLE public.recipients
ALTER COLUMN document_id DROP NOT NULL;
