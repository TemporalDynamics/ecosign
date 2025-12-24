-- ============================================
-- E2E Encryption: Profiles Table
-- ============================================
-- Create profiles table for user-specific E2E metadata
-- wrap_salt is PUBLIC (not secret) and used for PBKDF2

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY
    REFERENCES auth.users(id)
    ON DELETE CASCADE,
  wrap_salt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.profiles
IS 'User profile metadata for E2E encryption and preferences';

COMMENT ON COLUMN public.profiles.wrap_salt
IS 'Public salt for session unwrap key derivation (PBKDF2). Generated once per user, never changes.';

-- Enable pgcrypto extension for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Backfill existing users with wrap_salt
-- Use md5(gen_random_uuid()::text) as fallback for random bytes
INSERT INTO public.profiles (user_id, wrap_salt)
SELECT id, substring(md5(gen_random_uuid()::text || id::text) from 1 for 32)
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT (user_id) DO NOTHING;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id
ON public.profiles(user_id);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists (safe way for idempotency)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

-- RLS Policy: Users can only read their own profile
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);
