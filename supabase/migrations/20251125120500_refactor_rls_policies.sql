-- =================================================================
-- MIGRATION: Refactor RLS Policies (2025-11-25)
-- =================================================================
-- This migration continues to address "multiple permissive policies"
-- warnings from the Supabase dashboard.
--
-- 1.  **public.events**: Removes a redundant SELECT policy that was
--     renamed in a later migration but not dropped.
-- 2.  **public.signature_workflows**: Refactors the policies to
--     separate SELECT logic from management (INSERT/UPDATE/DELETE)
--     logic, resolving the overlap.
-- =================================================================

-- =================================================================
-- 1. Drop redundant SELECT policy on public.events
-- =================================================================
-- "Users can view events for own documents" was replaced by
-- "Users can view events for their documents" but the old one was
-- not removed.

DROP POLICY IF EXISTS "Users can view events for own documents" ON public.events;


-- =================================================================
-- 2. Refactor SELECT and management policies on public.signature_workflows
-- =================================================================

-- Drop the old, overlapping policies
DROP POLICY IF EXISTS workflows_owner_access ON public.signature_workflows;
DROP POLICY IF EXISTS workflows_signer_access ON public.signature_workflows;

-- Create a new, consolidated SELECT policy for both owners and signers
CREATE POLICY "Users can view their workflows"
  ON public.signature_workflows
  FOR SELECT
  USING (
    -- User is the owner
    (SELECT auth.uid()) = owner_id
    OR
    -- User is a signer in the workflow
    id IN (
      SELECT workflow_id FROM public.workflow_signers
      WHERE email = (SELECT u.email FROM auth.users u WHERE u.id = (SELECT auth.uid()))
    )
  );
COMMENT ON POLICY "Users can view their workflows" ON public.signature_workflows IS 'Allows owners and assigned signers to view workflows.';

-- Create new, specific management policies for owners only
CREATE POLICY "Owners can insert workflows"
  ON public.signature_workflows
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = owner_id);

CREATE POLICY "Owners can update workflows"
  ON public.signature_workflows
  FOR UPDATE
  USING ((SELECT auth.uid()) = owner_id)
  WITH CHECK ((SELECT auth.uid()) = owner_id);

CREATE POLICY "Owners can delete workflows"
  ON public.signature_workflows
  FOR DELETE
  USING ((SELECT auth.uid()) = owner_id);

COMMENT ON POLICY "Users can view their workflows" ON public.signature_workflows IS 'Allows owners and assigned signers to view workflows.';
COMMENT ON POLICY "Owners can insert workflows" ON public.signature_workflows IS 'Allows workflow owners to create them.';
COMMENT ON POLICY "Owners can update workflows" ON public.signature_workflows IS 'Allows workflow owners to update them.';
COMMENT ON POLICY "Owners can delete workflows" ON public.signature_workflows IS 'Allows workflow owners to delete them.';


-- =================================================================
-- MIGRATION COMPLETE
-- =================================================================
