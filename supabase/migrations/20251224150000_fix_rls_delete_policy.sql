-- ============================================
-- Migration: Fix RLS delete policy for documents
-- Purpose: Allow owners to delete their own documents
-- Date: 2025-12-24
-- ============================================

-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Users can delete their own documents." ON public.documents;

-- Create a new policy for DELETE
CREATE POLICY "Users can delete their own documents."
ON public.documents FOR DELETE
USING (auth.uid() = owner_id);

COMMENT ON POLICY "Users can delete their own documents." ON public.documents IS
  'Allows document owners to delete their own documents.';
