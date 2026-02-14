-- Migration: Fix access to signed documents for workflow participants
-- Purpose: Allow document owners and signers to access signed documents in signed/ paths
-- Date: 2026-02-13

-- Drop the overly restrictive policies
DROP POLICY IF EXISTS "user_documents_signed_select_own" ON storage.objects;

-- Create comprehensive policy for signed documents access
-- Allows access to signed/{workflow_id}/{signer_id}/{hash}.pdf paths
CREATE POLICY "workflow_participants_can_access_signed_docs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND (storage.foldername(name))[1] = 'signed'
    AND array_length(storage.foldername(name), 1) >= 3  -- Ensure path has at least 3 segments: signed/workflow_id/signer_id
    AND (
      -- Document owner can access signed docs from their workflows
      EXISTS (
        SELECT 1
        FROM public.signature_workflows sw
        WHERE sw.id = ((storage.foldername(name))[2])::uuid  -- Cast to UUID since workflow_id is UUID
          AND sw.owner_id = auth.uid()
      )
      OR
      -- Signer can access signed docs from workflows they participated in
      EXISTS (
        SELECT 1
        FROM public.workflow_signers ws
        JOIN public.signature_workflows sw ON sw.id = ws.workflow_id
        WHERE sw.id = ((storage.foldername(name))[2])::uuid  -- Cast to UUID since workflow_id is UUID
          AND ws.email = auth.email()  -- Match by email since workflow_signers uses email
      )
    )
  );