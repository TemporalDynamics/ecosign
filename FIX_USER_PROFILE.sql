-- ============================================
-- Fix: Create profile for existing user
-- ============================================
-- This user logged in before profiles table existed

-- Insert profile with wrap_salt for user
INSERT INTO public.profiles (user_id, wrap_salt, created_at)
VALUES (
  '09100ab3-85fe-4797-a45e-e2f3cc21b1fc',
  substring(md5(gen_random_uuid()::text || '09100ab3-85fe-4797-a45e-e2f3cc21b1fc'::text) from 1 for 32),
  NOW()
)
ON CONFLICT (user_id) DO NOTHING;

-- Verify it was created
SELECT user_id, wrap_salt, created_at 
FROM public.profiles 
WHERE user_id = '09100ab3-85fe-4797-a45e-e2f3cc21b1fc';
