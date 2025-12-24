-- ============================================
-- E2E Encryption: Fix profiles RLS for upsert
-- ============================================
-- Allow users to create/update their own profile
-- This fixes wrap_salt initialization for existing users

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

-- Policy: Users can SELECT their own profile
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can INSERT their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can UPDATE their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
