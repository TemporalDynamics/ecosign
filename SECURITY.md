# 🔒 Security Policy — EcoSign

## 📢 Reporting a Vulnerability

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please report security issues to:
- **Email:** security@ecosign.com (o el correo del equipo)
- **Subject:** `[SECURITY] Brief description`

We will respond within 48 hours and work with you to understand and address the issue.

---

## 🔑 Secret Management

### Where Secrets Live

**Client (Frontend):**
- `.env` (local development only, gitignored)
- Vercel Environment Variables (production)
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

**Supabase (Backend):**
- Supabase Dashboard → Project Settings → API
  - Service role key (NEVER expose to client)
  - JWT secret

**Third-party Services:**
- SignNow API credentials (backend only)
- TSA provider credentials
- Polygon RPC endpoints

### Rotation Process

**If a secret is compromised:**

1. **Immediate action:**
   - Rotate the compromised key in the service dashboard
   - Update environment variables in Vercel/Supabase
   - Verify old key is revoked

2. **For Supabase keys:**
   - Dashboard → Settings → API → Generate new anon key
   - Update `VITE_SUPABASE_ANON_KEY` in Vercel
   - Redeploy

3. **For SignNow / TSA:**
   - Generate new API key in provider dashboard
   - Update backend environment variables
   - Test integration

4. **After rotation:**
   - Monitor logs for errors
   - Verify all services work correctly
   - Document incident (if applicable)

### Prevention

- ✅ Use `.env.example` as template (never commit `.env`)
- ✅ All secrets in Vercel/Supabase environment variables
- ✅ Never hardcode secrets in source code
- ✅ Regular audits with `npm audit`
- ✅ Dependabot enabled for automatic security updates
- ✅ GitHub Secret Scanning enabled

---

## 🛡️ Security Headers

We implement the following security headers (see `vercel.json`):

- **X-Content-Type-Options:** `nosniff` (prevent MIME sniffing)
- **X-Frame-Options:** `DENY` (prevent clickjacking)
- **X-XSS-Protection:** `1; mode=block` (XSS protection)
- **Strict-Transport-Security:** `max-age=31536000` (force HTTPS)
- **Referrer-Policy:** `strict-origin-when-cross-origin`
- **Permissions-Policy:** Restricts camera, mic, geolocation

---

## 🍪 Cookie Security

Supabase session cookies are configured with:
- `Secure` flag (HTTPS only)
- `HttpOnly` flag (no JavaScript access)
- `SameSite=Lax` (CSRF protection)

Configuration in Supabase client initialization (client-side).

---

## 🔐 Authentication & Authorization

### Authentication Flow
1. User signs in via Supabase Auth (email/password or OAuth)
2. JWT token stored in HttpOnly cookie
3. Token validated on each request
4. RLS (Row Level Security) enforces data access

### Row Level Security (RLS)
All Supabase tables have RLS policies:
- Users can only access their own documents
- Shared documents require explicit permission
- Admin role for internal operations

See: `supabase/migrations/*.sql`

---

## 🚨 Known Security Considerations

### Pre-MVP Status
- **Key rotation:** Manual process (automated rotation planned post-MVP)
- **KMS:** Not yet implemented (using Supabase built-in encryption)
- **Rate limiting:** Vercel basic protection (dedicated solution planned)
- **WAF:** Vercel default (advanced rules planned)

### Future Enhancements (Post-MVP)
- [ ] AWS KMS / Cloud KMS for signature keys
- [ ] Automated key rotation
- [ ] Rate limiting per user/IP (Upstash/Redis)
- [ ] Advanced WAF rules
- [ ] Penetration testing
- [ ] Security audit by third-party

---

## 📊 Dependency Security

### Automated Monitoring
- **Dependabot:** Weekly checks for vulnerable dependencies
- **npm audit:** Run before each deployment
- **GitHub Secret Scanning:** Detects leaked credentials

### Manual Process
```bash
# Check for vulnerabilities
npm audit

# Auto-fix non-breaking changes
npm audit fix

# Review breaking changes
npm audit fix --force  # ⚠️ Test thoroughly before deploy
```

---

## 🧪 Security Testing

### Current Coverage
- XSS prevention tests (`tests/security/xss.test.ts`)
- SQL injection tests (if applicable)
- Input validation tests

### Manual Testing Checklist
- [ ] Try XSS payloads in all input fields
- [ ] Test file upload limits and types
- [ ] Verify HTTPS redirect works
- [ ] Check cookie flags in browser DevTools
- [ ] Test RLS policies with different users
- [ ] Verify JWT expiration works

---

## 📝 Incident Response

**If a security incident occurs:**

1. **Contain:** Isolate affected systems
2. **Assess:** Understand scope and impact
3. **Notify:** Alert team and affected users (if applicable)
4. **Remediate:** Fix vulnerability, rotate secrets
5. **Document:** Write post-mortem
6. **Learn:** Update this document and processes

---

## 📚 References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [Vercel Security Headers](https://vercel.com/docs/concepts/edge-network/headers)

---

**Last updated:** 2025-12-16  
**Version:** 1.0 (Pre-MVP)  
**Status:** Active
