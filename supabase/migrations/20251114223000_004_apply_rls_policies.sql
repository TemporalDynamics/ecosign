-- ========================================
-- RLS POLICIES (Simplified)
-- ========================================

-- Enable RLS on core tables
ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.nda_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.access_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.anchors ENABLE ROW LEVEL SECURITY;

-- Documents policies
DROP POLICY IF EXISTS "Users can view their own documents." ON public.documents;
CREATE POLICY "Users can view their own documents."
ON public.documents FOR SELECT
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert their own documents." ON public.documents;
CREATE POLICY "Users can insert their own documents."
ON public.documents FOR INSERT
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update their own documents." ON public.documents;
CREATE POLICY "Users can update their own documents."
ON public.documents FOR UPDATE
USING (auth.uid() = owner_id);

-- Links policies (for documents.links table, not access_links)
DROP POLICY IF EXISTS "Users can view links for their documents" ON public.links;
CREATE POLICY "Users can view links for their documents"
ON public.links FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE id = links.document_id
    AND owner_id = auth.uid()
  )
);

-- Recipients policies
DROP POLICY IF EXISTS "Users can view recipients for their documents" ON public.recipients;
CREATE POLICY "Users can view recipients for their documents"
ON public.recipients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE id = recipients.document_id
    AND owner_id = auth.uid()
  )
);

-- Access events policies
DROP POLICY IF EXISTS "Users can view access events" ON public.access_events;
CREATE POLICY "Users can view access events"
ON public.access_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.recipients r ON r.document_id = d.id
    WHERE r.id = access_events.recipient_id
    AND d.owner_id = auth.uid()
  )
);

-- Anchors policies
DROP POLICY IF EXISTS "Users can view anchors" ON public.anchors;
CREATE POLICY "Users can view anchors"
ON public.anchors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE id = anchors.document_id
    AND owner_id = auth.uid()
  )
);
