-- Migration: fix anchors RLS policy to use document_id (Gate 0)
-- Timestamp: 2026-01-11T05:07:00Z
BEGIN;

ALTER TABLE IF EXISTS public.anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.anchors FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anchors_select_authenticated ON public.anchors;
CREATE POLICY anchors_select_authenticated
  ON public.anchors
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents de
      WHERE de.id = public.anchors.document_id
        AND de.owner_id = auth.uid()
    )
  );

COMMIT;
