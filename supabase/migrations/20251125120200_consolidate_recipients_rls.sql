-- =================================================================
-- MIGRATION: Consolidate RLS Policies for Recipients (2025-11-25)
-- =================================================================
-- This migration consolidates multiple permissive SELECT policies on
-- the public.recipients table into a single policy for clarity and
-- maintainability.
-- =================================================================

-- =================================================================
-- 1. Consolidate SELECT policies on public.recipients
-- =================================================================
-- Old policies allowed access if:
--   a) The user's email matched the recipient's email.
--   b) The user was the owner of the associated document.
-- The new policy combines these with an OR condition and optimizes
-- the auth calls.

-- Drop the old, separate policies
DROP POLICY IF EXISTS "Recipients can view their own record" ON public.recipients;
DROP POLICY IF EXISTS "Owners can view recipients for their documents" ON public.recipients;

-- Create the new, consolidated policy
CREATE POLICY "Users can view recipient records"
  ON public.recipients
  FOR SELECT
  TO authenticated
  USING (
    -- Condition A: User is the recipient
    (SELECT auth.jwt() ->> 'email') = email
    OR
    -- Condition B: User is the owner of the document
    (SELECT auth.uid()) = (SELECT owner_id FROM documents WHERE id = document_id)
  );

COMMENT ON POLICY "Users can view recipient records" ON public.recipients IS 'Consolidated policy allowing access for the recipient and the document owner.';


-- =================================================================
-- MIGRATION COMPLETE
-- =================================================================
