# E2E Encryption MVP A1 - Implementation Guide

**Branch:** `feature/e2e-encryption-mvp-a1`  
**Status:** 🚧 In Progress  
**Architecture:** Zero Server-Side Knowledge

---

## 📋 Implementation Checklist

### Phase 1: Core Crypto Library ✅
- [x] `constants.ts` - Crypto parameters and config
- [x] `cryptoUtils.ts` - Low-level utilities (encoding, hashing)
- [x] `sessionCrypto.ts` - Session secret management
- [x] `documentEncryption.ts` - Encrypt/decrypt files
- [x] `otpSystem.ts` - OTP generation and key derivation
- [x] `index.ts` - Public API

### Phase 2: Database Schema
- [ ] Migration: Add `wrap_salt` to `user_profiles`
- [ ] Migration: Add encryption columns to `documents`
- [ ] Migration: Create `document_shares` table
- [ ] RLS policies for encrypted documents

### Phase 3: Storage Layer
- [ ] `encryptedDocumentStorage.ts` - Upload/download encrypted docs
- [ ] `documentSharing.ts` - Share with OTP
- [ ] Integration with existing storage utils

### Phase 4: Auth Integration
- [ ] Hook `initializeSessionCrypto()` on login success
- [ ] Hook `clearSessionCrypto()` on logout
- [ ] Ensure `wrap_salt` created on signup

### Phase 5: UI Components
- [ ] `EncryptionToggle.tsx` - Choose encrypted upload
- [ ] `OTPAccessModal.tsx` - Enter OTP to access shared doc
- [ ] `ShareWithOTPDialog.tsx` - Generate and share OTP
- [ ] `EncryptedDocumentBadge.tsx` - Visual indicator 🔒

### Phase 6: Edge Functions
- [ ] `send-share-otp` - Email OTP to recipient
- [ ] Update existing functions for encrypted docs

### Phase 7: Testing
- [ ] Unit tests for crypto primitives
- [ ] Integration tests for upload/download flow
- [ ] E2E tests for sharing flow
- [ ] Security audit

---

## 🔑 Key Architecture Decisions

### 1. Session Secret (Client-Generated)
```typescript
// Generated at login, NEVER sent to server
const sessionSecret = crypto.getRandomValues(new Uint8Array(32));

// Stored only in memory (volatile)
window.__sessionSecret = sessionSecret;

// Lost on browser close (by design)
```

### 2. Key Hierarchy
```
User Login
  └─> Session Secret (client-generated, 32 bytes)
       └─> Unwrap Key (derived via PBKDF2 + user's salt)
            └─> Document Key (wrapped, stored in DB)
                 └─> Encrypted Document (stored in Supabase Storage)
```

### 3. What Server Stores
- ✅ Encrypted blob (unintelligible)
- ✅ Wrapped document key (encrypted with unwrap key)
- ✅ Wrap IV (public)
- ✅ User's salt (public)
- ✅ Document hash (SHA-256 of original)
- ❌ Session secret (never leaves client)
- ❌ Unwrap key (never leaves client)
- ❌ Document key in plaintext (never exists on server)

### 4. Zero Server-Side Knowledge Guarantee
The server CANNOT:
- Derive the unwrap key (doesn't have session secret)
- Unwrap the document key (doesn't have unwrap key)
- Decrypt the document (doesn't have document key)

---

## 🧪 Testing the Implementation

### Manual Test Flow

#### Test 1: Upload Encrypted Document
```typescript
// 1. Login (generates session secret)
await supabase.auth.signInWithOtp({ email: 'test@example.com' });

// 2. Initialize session crypto
await initializeSessionCrypto(user.id);

// 3. Upload document (encrypted)
const file = new File(['test content'], 'test.txt');
const result = await uploadEncryptedDocument(file, user.id);

// 4. Verify in DB
// - documents.encrypted = true
// - documents.wrapped_key = base64 string
// - Storage has encrypted blob
```

#### Test 2: Download (Same Session)
```typescript
// 1. Download document
const decrypted = await downloadEncryptedDocument(docId);

// 2. Verify content matches original
```

#### Test 3: Re-login and Access
```typescript
// 1. Close browser / clear session
clearSessionCrypto();

// 2. Re-login (new session secret)
await supabase.auth.signInWithOtp({ email: 'test@example.com' });
await initializeSessionCrypto(user.id);

// 3. Try to access old document
// Expected: Requires re-wrap (OTP flow)
```

#### Test 4: Share with OTP
```typescript
// 1. Owner shares document
const { otp, shareId } = await shareDocument(docId, 'recipient@example.com');

// 2. Recipient receives OTP via email
// 3. Recipient accesses with OTP
const decrypted = await accessSharedDocument(shareId, otp);

// 4. Verify content matches original
```

### Security Tests

#### Test: Server Cannot Decrypt
```sql
-- Verify wrapped_key cannot be unwrapped without client secret
SELECT wrapped_key, wrap_iv FROM documents WHERE id = :doc_id;
-- This data alone CANNOT decrypt the document
```

#### Test: OTP Expiration
```typescript
// 1. Generate share with OTP
// 2. Wait for expiration (7 days)
// 3. Try to access
// Expected: "Invalid or expired OTP"
```

#### Test: Session Isolation
```typescript
// 1. User A uploads doc
// 2. User B tries to access (different session)
// Expected: Permission denied (even if User B has the wrapped_key)
```

---

## 🚀 Deployment Steps

### 1. Database Migration
```bash
# Apply migrations
npm run db:migrate

# Verify tables
npm run db:verify
```

### 2. Update Environment Variables
```bash
# No new env vars needed (all client-side)
# Existing Supabase config is sufficient
```

### 3. Deploy
```bash
# Deploy to Vercel
git push origin feature/e2e-encryption-mvp-a1

# Vercel auto-deploys preview
# Test on preview URL
```

### 4. Enable for Users
```typescript
// Feature flag (optional)
const E2E_ENCRYPTION_ENABLED = true;

// Show encryption toggle in UI
{E2E_ENCRYPTION_ENABLED && <EncryptionToggle />}
```

---

## 📚 Developer Resources

### Key Files
- `/client/src/lib/e2e/` - Core crypto library
- `/supabase/migrations/` - Database schema
- `/docs/E2E_ENCRYPTION.md` - Architecture docs (this file)

### External References
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [OWASP Crypto Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [PBKDF2 Best Practices](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-132.pdf)

### Support
- Questions? Check `/docs/E2E_ENCRYPTION_FAQ.md`
- Security concerns? Email security@ecosign.app
- Bug reports? Open GitHub issue with `[E2E]` prefix

---

## 🔒 Security Considerations

### ✅ What This Protects Against
- Server compromise (server cannot decrypt)
- Database breach (only encrypted data exposed)
- Man-in-the-middle (TLS + client-side crypto)
- Insider threats (no access to plaintext)

### ⚠️ What This Does NOT Protect Against
- Compromised client device (malware)
- XSS attacks (mitigated by CSP, but still a risk)
- Phishing (user gives away OTP)
- Lost OTP (user cannot recover document)

### 🛡️ Additional Security Layers
- Content Security Policy (CSP)
- Subresource Integrity (SRI)
- Regular security audits
- User education on OTP security

---

**Last Updated:** 2025-12-22  
**Author:** EcoSign Engineering Team  
**Version:** 1.0.0-alpha
