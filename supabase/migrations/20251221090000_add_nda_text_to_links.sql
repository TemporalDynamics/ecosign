-- Add NDA text storage to links for recipient display + hashing
ALTER TABLE public.links
  ADD COLUMN IF NOT EXISTS nda_text TEXT;

COMMENT ON COLUMN public.links.nda_text IS 'NDA text defined by the sender for this link';
