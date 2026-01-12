# 🚨 EcoSign Runbook - Incident Response

**Version:** 1.0  
**Last Updated:** 2025-12-16  
**Audience:** Operations team, on-call engineers  
**Related:** [DEPLOYMENT.md](./DEPLOYMENT.md), [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 📋 Table of Contents

1. [Emergency Contacts](#emergency-contacts)
2. [Common Incidents](#common-incidents)
3. [Monitoring & Alerts](#monitoring--alerts)
4. [Troubleshooting Procedures](#troubleshooting-procedures)
5. [Rollback Procedures](#rollback-procedures)
6. [Post-Incident](#post-incident)

---

## 📞 Emergency Contacts

| Role | Primary | Backup | Response Time |
|------|---------|--------|---------------|
| **On-Call Engineer** | TBD | TBD | 15 min |
| **Tech Lead** | TBD | TBD | 30 min |
| **CTO** | TBD | TBD | 1 hour |
| **Supabase Support** | support@supabase.com | Dashboard | 2 hours (paid) |
| **Vercel Support** | vercel.com/help | Dashboard | 1 hour (pro) |
| **SignNow Support** | support@signnow.com | - | 4 hours |

### Escalation Path

```
Incident Detected
  ↓
On-Call Engineer (15 min)
  ↓ (if not resolved in 30 min)
Tech Lead (30 min)
  ↓ (if critical + affects users)
CTO (1 hour)
  ↓ (if data breach or legal)
Legal + Security Team
```

---

## 🚨 Common Incidents

### Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| **P0 - Critical** | Complete service outage | 15 min | Website down, DB unreachable |
| **P1 - High** | Major feature broken | 30 min | Signing broken, anchoring failing |
| **P2 - Medium** | Minor feature degraded | 2 hours | Slow queries, emails delayed |
| **P3 - Low** | Cosmetic or minor issue | Next business day | UI glitch, typo |

---

## 🔧 Troubleshooting Procedures

### Incident 1: Website Down (HTTP 500/503)

**Symptoms:**
- Users report "Service Unavailable"
- Vercel dashboard shows errors
- Health check failing

**Diagnosis:**

1. **Check Vercel Status**
   ```bash
   # Visit https://www.vercel-status.com
   # Or check dashboard: vercel.com/ecosign
   ```

2. **Check Recent Deploys**
   ```bash
   vercel ls ecosign --prod
   # Look for recent deployments
   ```

3. **Check Logs**
   ```bash
   vercel logs ecosign --prod --since 30m
   # Look for errors
   ```

**Resolution:**

**Option A: Rollback to previous deploy**
```bash
# List deployments
vercel ls ecosign --prod

# Rollback to known-good deployment
vercel rollback ecosign <deployment-url>

# Verify
curl -I https://ecosign.com
```

**Option B: Force redeploy**
```bash
# Re-trigger build from GitHub
git commit --allow-empty -m "Force redeploy"
git push origin main
```

**Option C: Emergency maintenance mode**
```bash
# Update docs/ops/vercel.json to show maintenance page
# (Requires deploy, so only if Vercel is working)
```

**Post-Resolution:**
- [ ] Verify with test user
- [ ] Check error rate in Vercel Analytics
- [ ] Document root cause

---

### Incident 2: Database Slow/Unresponsive

**Symptoms:**
- API calls timing out (>30s)
- Users report "Loading forever"
- Supabase dashboard shows high CPU/memory

**Diagnosis:**

1. **Check Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/<project-id>
   - Check: Database → Performance
   - Look for: Slow queries, connection pool exhausted

2. **Check Active Queries**
   ```sql
   -- Run in SQL Editor
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
   FROM pg_stat_activity 
   WHERE state = 'active' 
   ORDER BY duration DESC;
   ```

3. **Check Locks**
   ```sql
   SELECT 
     a.datname,
     a.usename,
     a.state,
     a.wait_event_type,
     a.wait_event,
     a.query
   FROM pg_stat_activity a
   WHERE a.wait_event_type IS NOT NULL;
   ```

**Resolution:**

**Option A: Kill long-running queries**
```sql
-- Find problematic query
SELECT pid, query FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 minutes';

-- Kill it (CAUTION: only if absolutely necessary)
SELECT pg_terminate_backend(<pid>);
```

**Option B: Restart database** (LAST RESORT)
```bash
# Supabase Dashboard → Database → Settings → Restart Database
# WARNING: This causes ~30s downtime
```

**Option C: Scale up database**
```bash
# Supabase Dashboard → Settings → Database → Upgrade Plan
# If consistently hitting limits
```

**Post-Resolution:**
- [ ] Add index if slow query identified
- [ ] Review query patterns
- [ ] Set up query timeout alerts

---

### Incident 3: Signature Workflow Stuck

**Symptoms:**
- User reports "Invite not sent"
- Workflow status stuck on "pending"
- SignNow webhook not received

**Diagnosis:**

1. **Check Workflow Status**
   ```sql
   -- Find stuck workflows
   SELECT id, status, created_at, updated_at, metadata
   FROM signature_workflows
   WHERE status = 'pending' 
   AND created_at < now() - interval '1 hour'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

2. **Check SignNow Logs**
   ```bash
   # Supabase Edge Function logs
   supabase functions logs webhook-signnow --since 1h

   # Look for webhook events
   ```

3. **Check SignNow Dashboard**
   - Login to: app.signnow.com
   - Check: Documents → Recent
   - Look for: Error status, failed invites

**Resolution:**

**Option A: Resend invites manually**
```typescript
// Via Supabase Edge Function or API
// POST /functions/v1/resend-workflow-invites
{
  "workflowId": "uuid-here"
}
```

**Option B: Cancel and recreate**
```sql
-- Cancel stuck workflow
UPDATE signature_workflows
SET status = 'cancelled', updated_at = now()
WHERE id = '<workflow-id>';

-- User can create new workflow
```

**Option C: SignNow support ticket**
```
If SignNow API is down or returning errors:
1. Check SignNow status: status.signnow.com
2. Open ticket: support@signnow.com
3. Include: document ID, timestamp, error message
```

**Post-Resolution:**
- [ ] Notify affected users
- [ ] Review SignNow API limits
- [ ] Add retry logic if missing

---

### Incident 4: Blockchain Anchoring Failing

**Symptoms:**
- Documents stuck in "pending anchoring" status
- No new transactions on Polygon
- Users report "Anchoring failed"

**Diagnosis:**

1. **Check Anchoring Queue**
   ```sql
   -- Check pending anchors
   SELECT COUNT(*) as pending_count
   FROM user_documents
   WHERE bitcoin_status = 'pending' OR overall_status = 'pending';
   ```

2. **Check Edge Function Logs**
   ```bash
   supabase functions logs anchor-polygon --since 1h

   # Look for errors like:
   # - "Insufficient funds"
   # - "RPC connection failed"
   # - "Transaction reverted"
   ```

3. **Check Wallet Balance**
   ```typescript
   // Via Supabase Edge Function or web3 script
   const balance = await provider.getBalance(WALLET_ADDRESS);
   console.log(`Balance: ${ethers.formatEther(balance)} MATIC`);
   // If < 0.1 MATIC, needs funding
   ```

4. **Check Polygon Network**
   - Visit: https://amoy.polygonscan.com (testnet) or polygonscan.com (mainnet)
   - Check: Network status, recent blocks
   - Look for: High gas prices, network congestion

**Resolution:**

**Option A: Fund wallet**
```bash
# Transfer MATIC to anchoring wallet
# Wallet address: (stored in Supabase secrets)

# Testnet: Use faucet
# https://faucet.polygon.technology

# Mainnet: Transfer from treasury wallet
```

**Option B: Retry failed anchors**
```bash
# Via Supabase cron or manual trigger
supabase functions invoke process-polygon-anchors
```

**Option C: Increase gas price**
```typescript
// If transactions stuck due to low gas
// Update edge function with higher gas:
const tx = await contract.anchorDocument(hash, {
  maxFeePerGas: ethers.parseUnits('100', 'gwei'),  // Increase if needed
  maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei')
});
```

**Post-Resolution:**
- [ ] Set up low-balance alerts
- [ ] Review gas price strategy
- [ ] Test with small batch first

---

### Incident 5: User Cannot Login

**Symptoms:**
- User reports "Invalid credentials" (but password is correct)
- Login button unresponsive
- Error: "Auth session expired"

**Diagnosis:**

1. **Check User Exists**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT id, email, created_at, last_sign_in_at 
   FROM auth.users 
   WHERE email = 'user@example.com';
   ```

2. **Check Auth Logs**
   ```bash
   # Supabase Dashboard → Authentication → Logs
   # Look for: Failed login attempts, rate limiting
   ```

3. **Check Email Confirmation**
   ```sql
   SELECT email, confirmed_at, email_confirmed_at
   FROM auth.users
   WHERE email = 'user@example.com';
   -- If confirmed_at is NULL, email not verified
   ```

**Resolution:**

**Option A: Resend confirmation email**
```bash
# Via Supabase Dashboard → Authentication → Users
# Click user → "Send Magic Link" or "Reset Password"
```

**Option B: Manually confirm email** (CAUTION)
```sql
-- Only if user lost confirmation email
UPDATE auth.users
SET email_confirmed_at = now(), confirmed_at = now()
WHERE email = 'user@example.com';
```

**Option C: Reset password**
```typescript
// Via Supabase client or Dashboard
await supabase.auth.resetPasswordForEmail('user@example.com', {
  redirectTo: 'https://ecosign.com/reset-password'
});
```

**Post-Resolution:**
- [ ] Verify user can login
- [ ] Check email deliverability
- [ ] Review auth flow for UX issues

---

### Incident 6: File Upload Failing

**Symptoms:**
- User reports "Upload failed"
- Error: "File too large" or "Invalid file type"
- Progress bar stuck at 0%

**Diagnosis:**

1. **Check File Size**
   ```typescript
   // Max file size in client/src/components/LegalCenterModal.jsx
   const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

   // Supabase Storage limit (default)
   const STORAGE_MAX = 50 * 1024 * 1024; // 50MB
   ```

2. **Check Storage Bucket**
   ```bash
   # Supabase Dashboard → Storage → Buckets
   # Check: documents/ bucket status, quota
   ```

3. **Check Browser Console**
   ```javascript
   // User's browser console (F12)
   // Look for: CORS errors, network failures, quota errors
   ```

**Resolution:**

**Option A: Increase file size limit**
```typescript
// client/src/components/LegalCenterModal.jsx
const MAX_FILE_SIZE = 20 * 1024 * 1024; // Increase to 20MB
```

**Option B: Check storage quota**
```bash
# Supabase Dashboard → Settings → Billing
# If quota exceeded, upgrade plan or clean up old files
```

**Option C: Clear CORS issues**
```bash
# Supabase Dashboard → Storage → Configuration
# Ensure allowed origins include: https://ecosign.com
```

**Post-Resolution:**
- [ ] Document new file size limits
- [ ] Add better error messages
- [ ] Set up storage quota alerts

---

## 🔄 Rollback Procedures

### Frontend Rollback (Vercel)

**When to rollback:**
- New deploy causes errors
- Critical bug in production
- Performance regression

**Steps:**

1. **Identify last-known-good deployment**
   ```bash
   vercel ls ecosign --prod
   # Note the deployment URL before the problematic one
   ```

2. **Rollback**
   ```bash
   vercel rollback ecosign <previous-deployment-url>
   ```

3. **Verify**
   ```bash
   curl -I https://ecosign.com
   # Check X-Vercel-Id header matches rollback target
   ```

4. **Notify team**
   ```
   Slack message:
   "🔄 Rolled back production to <commit-sha> due to <issue>.
   Investigating root cause. ETA for fix: <time>."
   ```

**Time:** ~5 minutes

---

### Database Rollback (Supabase)

**CAUTION:** Database rollbacks are DESTRUCTIVE. Only do if absolutely necessary.

**When to rollback:**
- Migration broke critical functionality
- Data corruption detected
- Schema change incompatible with current code

**Steps:**

1. **Stop writes** (if possible)
   ```sql
   -- Revoke write permissions temporarily
   REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM authenticated;
   ```

2. **Restore from backup**
   ```bash
   # Supabase Dashboard → Database → Backups
   # Select backup BEFORE the problematic migration
   # Click "Restore"
   # WARNING: This will OVERWRITE current data
   ```

3. **Verify schema**
   ```sql
   -- Check tables exist
   \dt public.*

   -- Check critical data
   SELECT COUNT(*) FROM user_documents;
   ```

4. **Re-enable writes**
   ```sql
   GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
   ```

**Time:** ~15 minutes + restore time (depends on DB size)

---

### Edge Functions Rollback

**When to rollback:**
- New function version causes errors
- Breaking change in API
- Performance issues

**Steps:**

1. **Identify previous version**
   ```bash
   # Functions are versioned by deployment
   # Check git history for previous version
   git log -- supabase/functions/<function-name>/
   ```

2. **Checkout previous version**
   ```bash
   git checkout <previous-commit> -- supabase/functions/<function-name>/
   ```

3. **Redeploy**
   ```bash
   supabase functions deploy <function-name>
   ```

4. **Verify**
   ```bash
   supabase functions logs <function-name> --since 5m
   # Check for successful invocations
   ```

**Time:** ~10 minutes

---

## 📊 Monitoring & Alerts

### Key Metrics to Monitor

| Metric | Tool | Threshold | Alert Level |
|--------|------|-----------|-------------|
| **Website uptime** | Vercel Analytics | <99.9% | P0 |
| **API error rate** | Supabase Logs | >5% | P1 |
| **Database CPU** | Supabase Dashboard | >80% | P2 |
| **Storage usage** | Supabase Dashboard | >80% | P2 |
| **Anchoring queue** | Custom query | >100 pending | P2 |
| **Wallet balance** | Custom script | <0.1 MATIC | P1 |
| **SignNow API errors** | Edge Function logs | >10% | P1 |

### Alert Channels

- **Critical (P0/P1):** PagerDuty → SMS + Phone call
- **High (P2):** Slack #alerts channel
- **Low (P3):** Email digest (daily)

---

## 📝 Post-Incident

### Incident Report Template

```markdown
# Incident Report: [Brief Title]

**Date:** YYYY-MM-DD  
**Duration:** XX minutes  
**Severity:** P0/P1/P2/P3  
**On-Call:** [Name]

## Summary
[2-3 sentence summary of what happened]

## Timeline
- HH:MM - Incident detected
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Fix applied
- HH:MM - Service restored
- HH:MM - Post-mortem completed

## Root Cause
[Detailed explanation of what caused the incident]

## Impact
- Users affected: [number or percentage]
- Services affected: [list]
- Data loss: [Yes/No, details]

## Resolution
[What was done to fix it]

## Prevention
- [ ] Action item 1
- [ ] Action item 2
- [ ] Action item 3

## Lessons Learned
[Key takeaways for future incidents]
```

### Post-Incident Review (PIR)

**Schedule within 24 hours of resolution**

**Attendees:**
- On-call engineer
- Tech lead
- Affected team members

**Agenda:**
1. Timeline review (10 min)
2. Root cause analysis (15 min)
3. Action items (15 min)
4. Documentation updates (10 min)

**Output:**
- Updated runbook (if needed)
- Jira tickets for preventive work
- Improved monitoring/alerts

---

## 🔗 Quick Links

| Resource | URL | Purpose |
|----------|-----|---------|
| **Vercel Dashboard** | vercel.com/ecosign | Deployments, logs, analytics |
| **Supabase Dashboard** | supabase.com/dashboard | Database, storage, functions |
| **Polygon Explorer** | polygonscan.com | Blockchain transactions |
| **SignNow Dashboard** | app.signnow.com | Signature workflows |
| **GitHub Repo** | github.com/[org]/ecosign | Source code, issues |
| **Slack #incidents** | slack.com/... | Real-time communication |
| **Status Page** | status.ecosign.com | Public status (future) |

---

## 📚 Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deploy procedures
- [ARCHITECTURE.md](./ARCHITECTURE.MD) - System architecture
- [SECURITY.md](../SECURITY.md) - Security incident response
- [PERFORMANCE.md](./PERFORMANCE.md) - Performance tuning

---

**Document Version:** 1.0  
**Last Review:** 2025-12-16  
**Next Review:** After first major incident  
**Maintainer:** Operations Team

---

## 🆘 Quick Reference Card

**Print this and keep at your desk:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              ECOSIGN INCIDENT RESPONSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ASSESS SEVERITY
   P0 = Complete outage → Call immediately
   P1 = Major feature broken → Slack + investigate
   P2 = Degraded → Investigate during business hours
   P3 = Minor → Next sprint

2. GATHER INFO
   ✓ Vercel logs:  vercel logs ecosign --prod --since 30m
   ✓ Supabase:     Dashboard → Database → Performance
   ✓ User reports: Slack #support

3. COMMON FIXES
   Website down    → vercel rollback <url>
   DB slow         → Check slow queries, kill if needed
   Anchoring stuck → Check wallet balance + retry
   Login broken    → Check auth logs + reset password

4. ROLLBACK IF NEEDED
   Frontend → vercel rollback
   Backend  → Restore from backup (CAUTION)
   Function → Redeploy previous version

5. DOCUMENT
   Create incident report in /docs/incidents/
   Schedule PIR within 24 hours
   Update runbook with learnings

EMERGENCY: Call Tech Lead if not resolved in 30 min
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
