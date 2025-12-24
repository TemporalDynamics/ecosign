-- ============================================
-- Test RLS on profiles table
-- ============================================
-- Run this to verify current RLS state

-- 1. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 2. List all policies on profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;

-- 3. Test SELECT as authenticated user (simulated)
-- This shows what auth.uid() would return
SELECT auth.uid() AS current_user_id;

-- 4. Check if current session can read profiles
SELECT user_id, wrap_salt 
FROM profiles 
WHERE user_id = auth.uid()
LIMIT 1;
