# 📋 Manual Migration Instructions

**Date:** 2025-12-22  
**Migrations:** E2E Encryption (4 migrations)  
**Why Manual:** Supabase CLI had permission issues with a previous migration

---

## ✅ Quick Apply (2 Steps)

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/uiyojopjbhooxrmamaiw
2. Click **SQL Editor** in the sidebar
3. Click **New query**

### Step 2: Run This SQL

Copy and paste the complete script below:

```sql
-- ============================================
-- E2E ENCRYPTION MIGRATIONS
-- ============================================

-- Migration 1: Create Profiles Table
-- ============================================
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
IS 'Public salt for session unwrap key derivation (PBKDF2). Generated once per user.';

-- Backfill existing users
INSERT INTO public.profiles (user_id, wrap_salt)
SELECT id, encode(gen_random_bytes(16), 'hex')
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles);

-- Index
CREATE INDEX IF NOT EXISTS idx_profiles_user_id
ON public.profiles(user_id);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can read own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Migration 2: Documents (encryption columns)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS encrypted BOOLEAN DEFAULT FALSE;

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS encrypted_path TEXT;

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS wrapped_key TEXT;

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS wrap_iv TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_encrypted 
ON documents(owner_id, encrypted) 
WHERE encrypted = TRUE;

COMMENT ON COLUMN documents.encrypted IS 'Whether this document is client-side encrypted (E2E)';
COMMENT ON COLUMN documents.encrypted_path IS 'Storage path for encrypted blob (if encrypted = true)';
COMMENT ON COLUMN documents.wrapped_key IS 'Document key wrapped with session unwrap key (base64). Server cannot unwrap without client secret.';
COMMENT ON COLUMN documents.wrap_iv IS 'IV used for key wrapping (hex string)';

-- Migration 3: Document Shares (new table)
CREATE TABLE IF NOT EXISTS document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  wrapped_key TEXT NOT NULL,
  wrap_iv TEXT NOT NULL,
  recipient_salt TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accessed', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_pending_share UNIQUE (document_id, recipient_email, status)
);

CREATE INDEX IF NOT EXISTS idx_document_shares_document 
ON document_shares(document_id);

CREATE INDEX IF NOT EXISTS idx_document_shares_recipient 
ON document_shares(recipient_email, status);

CREATE INDEX IF NOT EXISTS idx_document_shares_otp 
ON document_shares(otp_hash) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_document_shares_expires 
ON document_shares(expires_at) 
WHERE status = 'pending';

ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view shares of their documents"
ON document_shares
FOR SELECT
USING (
  created_by = auth.uid()
  OR 
  document_id IN (
    SELECT id FROM documents WHERE owner_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "Users can create shares for their documents"
ON document_shares
FOR INSERT
WITH CHECK (
  document_id IN (
    SELECT id FROM documents WHERE owner_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "Service role full access"
ON document_shares
FOR ALL
USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION expire_document_shares()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE document_shares
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER auto_expire_shares
AFTER SELECT ON document_shares
FOR EACH STATEMENT
EXECUTE FUNCTION expire_document_shares();

COMMENT ON TABLE document_shares IS 'OTP-based document sharing for E2E encrypted documents';
COMMENT ON COLUMN document_shares.wrapped_key IS 'Document key wrapped with OTP-derived key';
COMMENT ON COLUMN document_shares.otp_hash IS 'SHA-256 hash of OTP (never store plaintext)';
COMMENT ON COLUMN document_shares.recipient_salt IS 'Public salt for OTP key derivation';

-- Verify
SELECT 'E2E Encryption migrations applied successfully! ✅' as status;
```

### Step 3: Run and Verify

1. Click **Run** (or press Ctrl+Enter)
2. You should see: "E2E Encryption migrations applied successfully! ✅"
3. Check the **Results** tab for any errors

---

## ✅ Verification Queries

After applying, run these to verify:

```sql
-- Check profiles table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'profiles';
-- Expected: profiles

-- Check wrap_salt column
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'wrap_salt';
-- Expected: wrap_salt | text | NO

-- Verify users have wrap_salt
SELECT COUNT(*) as users_with_salt
FROM public.profiles
WHERE wrap_salt IS NOT NULL;
-- Expected: Should match number of users

-- Check documents encryption columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'documents' 
  AND column_name IN ('encrypted', 'encrypted_path', 'wrapped_key', 'wrap_iv');
-- Expected: 4 rows

-- Check document_shares table
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'document_shares';
-- Expected: document_shares

-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('profiles', 'document_shares');
-- Expected: Multiple policies
```

---

## 🚨 If Something Goes Wrong

### Error: "column already exists"
- **Solution:** Ignore, it means the migration was already applied (IF NOT EXISTS protects us)

### Error: "permission denied"
- **Solution:** Make sure you're running as the database owner (usually you're auto-authenticated)

### Error: "relation 'documents' does not exist"
- **Solution:** Check that `documents` table exists first. This is a core table and should exist.

### Error: "duplicate key value violates unique constraint"
- **Solution:** Some users already have profiles. This is fine, the INSERT will skip them (NOT IN clause)

---

## 📝 What Each Migration Does

### Migration 1: public.profiles table
- Creates new `profiles` table (1 row per user)
- Links to `auth.users(id)` with CASCADE delete
- Generates unique `wrap_salt` for each existing user
- Used for PBKDF2 (session unwrap key derivation)
- RLS policy: users can only read their own profile

### Migration 2: documents encryption columns
- `encrypted`: Boolean flag for E2E docs
- `encrypted_path`: Storage location of encrypted blob
- `wrapped_key`: Document key (encrypted with unwrap key)
- `wrap_iv`: IV used for key wrapping

### Migration 3: document_shares table
- Complete OTP sharing system
- Wrapped keys per recipient
- Auto-expiration (7 days default)
- RLS policies for access control
- One-time access tracking

---

## ✅ After Applying

You should see in Supabase Dashboard:

**New Tables:**
- `public.profiles` (new) ← **This is the key change!**
- `documents` (updated with encryption columns)
- `document_shares` (new)

**New Columns:**
- `profiles.wrap_salt` ← **Critical for E2E**
- `documents.encrypted`
- `documents.encrypted_path`
- `documents.wrapped_key`
- `documents.wrap_iv`

---

## 🔧 Code Changes Required

After applying migrations, update your code:

### ❌ Old (incorrect):
```typescript
const { data: profile } = await supabase
  .from('user_profiles')  // ❌ This table doesn't exist
  .select('wrap_salt')
```

### ✅ New (correct):
```typescript
const { data: profile } = await supabase
  .from('profiles')  // ✅ Correct table name
  .select('wrap_salt')
  .eq('user_id', user.id)
  .single();
```

---

## 🧪 Test Query (Verify Everything Works)

Run this to see users with their wrap_salt:

```sql
SELECT
  u.id,
  u.email,
  p.wrap_salt,
  p.created_at
FROM auth.users u
JOIN public.profiles p ON p.user_id = u.id
LIMIT 5;
```

Expected result: List of users with their wrap_salt values.

---

**Ready to proceed with Phase 3!** 🚀
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS encrypted BOOLEAN DEFAULT FALSE;

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS encrypted_path TEXT;

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS wrapped_key TEXT;

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS wrap_iv TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_encrypted 
ON documents(owner_id, encrypted) 
WHERE encrypted = TRUE;

COMMENT ON COLUMN documents.encrypted IS 'Whether this document is client-side encrypted (E2E)';
COMMENT ON COLUMN documents.encrypted_path IS 'Storage path for encrypted blob (if encrypted = true)';
COMMENT ON COLUMN documents.wrapped_key IS 'Document key wrapped with session unwrap key (base64). Server cannot unwrap without client secret.';
COMMENT ON COLUMN documents.wrap_iv IS 'IV used for key wrapping (hex string)';

-- Migration 3: Document Shares (new table)
CREATE TABLE IF NOT EXISTS document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  wrapped_key TEXT NOT NULL,
  wrap_iv TEXT NOT NULL,
  recipient_salt TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accessed', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_pending_share UNIQUE (document_id, recipient_email, status)
);

CREATE INDEX IF NOT EXISTS idx_document_shares_document 
ON document_shares(document_id);

CREATE INDEX IF NOT EXISTS idx_document_shares_recipient 
ON document_shares(recipient_email, status);

CREATE INDEX IF NOT EXISTS idx_document_shares_otp 
ON document_shares(otp_hash) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_document_shares_expires 
ON document_shares(expires_at) 
WHERE status = 'pending';

ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view shares of their documents"
ON document_shares
FOR SELECT
USING (
  created_by = auth.uid()
  OR 
  document_id IN (
    SELECT id FROM documents WHERE owner_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "Users can create shares for their documents"
ON document_shares
FOR INSERT
WITH CHECK (
  document_id IN (
    SELECT id FROM documents WHERE owner_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "Service role full access"
ON document_shares
FOR ALL
USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION expire_document_shares()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE document_shares
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER auto_expire_shares
AFTER SELECT ON document_shares
FOR EACH STATEMENT
EXECUTE FUNCTION expire_document_shares();

COMMENT ON TABLE document_shares IS 'OTP-based document sharing for E2E encrypted documents';
COMMENT ON COLUMN document_shares.wrapped_key IS 'Document key wrapped with OTP-derived key';
COMMENT ON COLUMN document_shares.otp_hash IS 'SHA-256 hash of OTP (never store plaintext)';
COMMENT ON COLUMN document_shares.recipient_salt IS 'Public salt for OTP key derivation';

-- Verify
SELECT 'E2E Encryption migrations applied successfully! ✅' as status;
```

### Step 3: Run and Verify

1. Click **Run** (or press Ctrl+Enter)
2. You should see: "E2E Encryption migrations applied successfully! ✅"
3. Check the **Results** tab for any errors

---

## ✅ Verification Queries

After applying, run these to verify:

```sql
-- Check wrap_salt column
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'wrap_salt';
-- Expected: wrap_salt | text | NO

-- Check documents encryption columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'documents' 
  AND column_name IN ('encrypted', 'encrypted_path', 'wrapped_key', 'wrap_iv');
-- Expected: 4 rows

-- Check document_shares table
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'document_shares';
-- Expected: document_shares

-- Check RLS policies
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'document_shares';
-- Expected: 3 policies
```

---

## 🚨 If Something Goes Wrong

### Error: "column already exists"
- **Solution:** Ignore, it means the migration was already applied (IF NOT EXISTS protects us)

### Error: "permission denied"
- **Solution:** Make sure you're running as the database owner (usually you're auto-authenticated)

### Error: "relation does not exist"
- **Solution:** Check that `user_profiles` and `documents` tables exist first

---

## 📝 What Each Migration Does

### Migration 1: user_profiles.wrap_salt
- Adds public salt for key derivation
- Generates unique salt for each existing user
- Used for PBKDF2 (session unwrap key)

### Migration 2: documents encryption columns
- `encrypted`: Boolean flag for E2E docs
- `encrypted_path`: Storage location
- `wrapped_key`: Document key (encrypted)
- `wrap_iv`: IV for key wrapping

### Migration 3: document_shares table
- Complete OTP sharing system
- Wrapped keys per recipient
- Auto-expiration (7 days)
- RLS policies for access control

---

## ✅ After Applying

You should see in Supabase Dashboard:

**Tables:**
- `user_profiles` (updated)
- `documents` (updated)
- `document_shares` (new)

**New Columns:**
- `user_profiles.wrap_salt`
- `documents.encrypted`
- `documents.encrypted_path`
- `documents.wrapped_key`
- `documents.wrap_iv`

---

**Ready to proceed with Phase 3!** 🚀
