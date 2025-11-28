-- ============================================
-- Migration: Allow signers to update workflow document fields
-- Purpose: Permit signers to update document_path, document_hash, encryption_key
-- Date: 2025-11-27
-- ============================================

-- Allow signers to update workflow when they're signing
CREATE POLICY "Signers can update workflow document path"
ON public.signature_workflows
FOR UPDATE
TO authenticated
USING (
  -- Allow update if user is a signer in this workflow
  EXISTS (
    SELECT 1
    FROM public.workflow_signers ws
    WHERE ws.workflow_id = signature_workflows.id
      AND ws.email = auth.email()
  )
)
WITH CHECK (true);

-- ============================================
-- NOTES:
-- ============================================
-- This allows signers to update signature_workflows when they apply their signature
-- Specifically needed for updating document_path, document_hash, and encryption_key
-- after each signature is applied.
--
-- For MVP this is acceptable. In production, you might want to:
-- 1. Move this logic to an Edge Function with service_role
-- 2. Or use a more restrictive policy that only allows updating specific columns
