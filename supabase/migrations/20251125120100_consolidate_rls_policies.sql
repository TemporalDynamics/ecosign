-- =================================================================
-- MIGRATION: Consolidate RLS Policies (2025-11-25)
-- =================================================================
-- This migration consolidates multiple permissive RLS policies into a
-- single policy for clarity and maintainability. This addresses the
-- "multiple permissive policies" warnings from the Supabase dashboard.
-- =================================================================

-- =================================================================
-- 1. Consolidate SELECT policies on public.invites
-- =================================================================
-- Old policies allowed access if:
--   a) The user was the sender (`invited_by`).
--   b) The user's email matched the invitee's email.
-- The new policy combines these with an OR condition.

-- Drop the old, separate policies
DROP POLICY IF EXISTS "Users can view their sent invites" ON public.invites;
DROP POLICY IF EXISTS "Invitees can view their invites" ON public.invites;

-- Create the new, consolidated policy
CREATE POLICY "Users and invitees can view invites"
  ON public.invites
  FOR SELECT
  TO authenticated
  USING (
    -- Condition A: User is the one who sent the invite
    invited_by = (SELECT auth.uid())
    OR
    -- Condition B: User's email matches the invitee's email
    email = (SELECT u.email FROM auth.users u WHERE u.id = (SELECT auth.uid()))
  );

COMMENT ON POLICY "Users and invitees can view invites" ON public.invites IS 'Consolidated policy allowing access for both the sender and the intended recipient of an invite.';


-- =================================================================
-- MIGRATION COMPLETE
-- =================================================================
