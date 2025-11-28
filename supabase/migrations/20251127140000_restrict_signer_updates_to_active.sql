-- ============================================
-- Migration: Restrict signer updates to active workflows
-- Purpose: Add status='active' check to signer UPDATE policy for security
-- Date: 2025-11-27
-- ============================================

-- Drop the old policy
DROP POLICY IF EXISTS "Signers can update workflow document path" ON public.signature_workflows;

-- Create more restrictive policy that only allows updates on active workflows
CREATE POLICY "Signers can update workflow document path"
ON public.signature_workflows
FOR UPDATE
TO authenticated
USING (
  -- Allow update if user is a signer in this workflow AND workflow is active
  status = 'active'
  AND EXISTS (
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
-- This restricts signers to only update workflows that are in 'active' status.
-- This prevents:
-- - Updating completed workflows
-- - Updating cancelled workflows
-- - Updating workflows in any other terminal state
--
-- TODO FOR PUBLIC MVP LAUNCH:
-- Move this logic to an Edge Function with service_role privileges.
-- This will allow:
-- 1. More granular control over which columns can be updated
-- 2. Rate limiting and abuse prevention
-- 3. Better audit logging
-- 4. Validation of document hash consistency
-- 5. Prevention of malicious updates
--
-- For now (private MVP), this status='active' check provides adequate protection.
