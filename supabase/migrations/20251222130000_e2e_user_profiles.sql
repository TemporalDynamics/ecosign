-- ============================================
-- E2E Encryption: User Profiles
-- ============================================
-- Add wrap_salt to user_profiles for key derivation
-- This salt is PUBLIC (not secret) and used for PBKDF2

-- Add wrap_salt column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS wrap_salt TEXT;

-- Generate salt for existing users (if NULL)
UPDATE user_profiles 
SET wrap_salt = encode(gen_random_bytes(16), 'hex')
WHERE wrap_salt IS NULL;

-- Make it NOT NULL going forward
ALTER TABLE user_profiles 
ALTER COLUMN wrap_salt SET NOT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_wrap_salt 
ON user_profiles(user_id, wrap_salt);

-- Comment
COMMENT ON COLUMN user_profiles.wrap_salt IS 'Public salt for session unwrap key derivation (PBKDF2). Generated once per user, never changes.';
