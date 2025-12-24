-- ============================================
-- Fix: Complete RLS for authenticated users on documents
-- Date: 2025-12-24
-- ============================================

-- DELETE
DROP POLICY IF EXISTS "Users can delete their own documents." ON public.documents;

CREATE POLICY "Users can delete their own documents."
ON public.documents
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- UPDATE (WITH CHECK faltante)
DROP POLICY IF EXISTS "Users can update their own documents." ON public.documents;

CREATE POLICY "Users can update their own documents."
ON public.documents
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);
