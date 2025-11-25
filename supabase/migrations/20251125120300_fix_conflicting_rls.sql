-- =================================================================
-- MIGRATION: Fix Conflicting & Multiple RLS Policies (2025-11-25)
-- =================================================================

-- =================================================================
-- 1. Fix Conflicting INSERT policy on public.events
-- =================================================================
-- The policy "Users can create events" allowed any authenticated user
-- to insert events, overriding the intended blocking policy.
-- This removes the insecure policy, ensuring only service_role can insert.

DROP POLICY IF EXISTS "Users can create events" ON public.events;

-- =================================================================
-- 2. Consolidate SELECT policies on public.anchors
-- =================================================================
-- Consolidates policies for owners and public viewers of confirmed anchors.

-- Drop the old, separate policies
DROP POLICY IF EXISTS "Users can view their own anchors" ON public.anchors;
DROP POLICY IF EXISTS "Public can view confirmed anchors" ON public.anchors;
DROP POLICY IF EXISTS "Public can view confirmed anchors by hash" ON public.anchors; -- Just in case

-- Create the new, consolidated policy
CREATE POLICY "Users can view anchors"
  ON public.anchors
  FOR SELECT
  TO authenticated
  USING (
    -- User is the owner
    (SELECT auth.uid()) = user_id
    OR
    -- Anchor is confirmed
    anchor_status = 'confirmed'
  );

COMMENT ON POLICY "Users can view anchors" ON public.anchors IS 'Consolidated policy for owners and viewers of confirmed anchors.';

-- =================================================================
-- MIGRATION COMPLETE
-- =================================================================
