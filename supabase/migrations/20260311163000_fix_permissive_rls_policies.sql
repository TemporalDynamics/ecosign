-- Fix permissive RLS policies flagged by Security Advisor
-- Date: 2026-03-11
-- Scope: tighten signer update policy; restrict contact_leads updates

BEGIN;

-- ------------------------------------------------------------------
-- 1) signature_workflows: tighten signer UPDATE policy
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Signers can update workflow document path" ON public.signature_workflows;

CREATE POLICY "Signers can update workflow document path"
  ON public.signature_workflows
  FOR UPDATE
  TO authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1
      FROM public.workflow_signers ws
      WHERE ws.workflow_id = signature_workflows.id
        AND ws.email = auth.email()
    )
  )
  WITH CHECK (
    status = 'active'
    AND EXISTS (
      SELECT 1
      FROM public.workflow_signers ws
      WHERE ws.workflow_id = signature_workflows.id
        AND ws.email = auth.email()
    )
  );

COMMENT ON POLICY "Signers can update workflow document path" ON public.signature_workflows
IS 'Signer updates allowed only for active workflows they belong to (USING = WITH CHECK).';

-- ------------------------------------------------------------------
-- 2) contact_leads: remove broad UPDATE policy (service_role bypasses RLS)
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.contact_leads;

COMMIT;
