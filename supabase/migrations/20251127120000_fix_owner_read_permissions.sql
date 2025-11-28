-- ============================================
-- Migration: Fix owner read permissions for signed PDFs
-- Purpose: Allow workflow owner to read signed documents uploaded by signers
-- Date: 2025-11-27
-- ============================================

DROP POLICY IF EXISTS "Workflow participants can read documents" ON storage.objects;

CREATE POLICY "Workflow participants can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    -- Owner of the workflow can read the document
    EXISTS (
      SELECT 1
      FROM public.signature_workflows sw
      WHERE sw.document_path = storage.objects.name
        AND sw.owner_id = auth.uid()
    )
    OR
    -- Any signer in the workflow can read the document
    EXISTS (
      SELECT 1
      FROM public.workflow_signers ws
      JOIN public.signature_workflows sw ON sw.id = ws.workflow_id
      WHERE sw.document_path = storage.objects.name
        AND ws.email = auth.email()
    )
    OR
    -- Fallback: users can read files in their own folder
    auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- ============================================
-- NOTES:
-- ============================================
-- This fixes the issue where workflow owners couldn't read signed PDFs
-- uploaded by signers to paths like: signer_uid/workflow_id/signed_*.pdf.enc
-- Now the owner can read because signature_workflows.document_path matches
