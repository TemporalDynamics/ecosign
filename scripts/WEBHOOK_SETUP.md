# Webhook Setup Guide

## 🔴 The Problem (You Discovered It Correctly)

Supabase has **two types** of Database Webhooks:

### ❌ Wrong: "Supabase Edge Function" trigger
- **NO** Delivery Logs visible
- **NO** reliable debugging
- Fails silently (your exact symptom)
- Auto-adds Authorization header (can't remove it)
- Has known bugs with auth/headers

### ✅ Right: "HTTP Request" trigger
- **YES** Delivery Logs visible
- **YES** full debugging
- Reliable HTTP status codes
- You control ALL headers
- Use this even when calling Edge Functions

## 📋 Manual Setup (Dashboard - Recommended for now)

1. **Database → Webhooks → Create new webhook**

2. **Configuration:**
   ```
   Name: process-signer-signed-webhook
   Type: HTTP Request  ← CRITICAL: NOT "Edge Function"
   ```

3. **Trigger:**
   ```
   Schema: public
   Table: workflow_events
   Events: ☑ INSERT only
   Filter: event_type=eq.signer.signed
   ```

4. **HTTP Request:**
   ```
   Method: POST
   URL: https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/process-signer-signed
   ```

5. **Headers:**
   ```json
   {
     "Content-Type": "application/json",
     "apikey": "<YOUR_SERVICE_ROLE_KEY>"
   }
   ```

   ⚠️ **DO NOT** add `Authorization` header
   ⚠️ Use `apikey`, NOT anon key

6. **Body:**
   ```json
   {
     "record": {{ record }}
   }
   ```

   Yes, with double curly braces `{{ record }}`

7. **Enable** → Toggle to green

## 🧪 Verify It's Working

1. **Insert a test event:**
   ```sql
   INSERT INTO workflow_events (workflow_id, signer_id, event_type)
   VALUES (
     'some-workflow-uuid',
     'some-signer-uuid',
     'signer.signed'
   );
   ```

2. **Check Delivery Logs:**
   - Go to: Database → Webhooks → Your webhook → **Delivery Logs**
   - You should see:
     - `200` → Success
     - `401` → Bad apikey
     - `404` → Wrong URL
     - `500` → Check Edge Function logs

3. **If you see NOTHING:**
   - You're using the wrong webhook type ("Edge Function" instead of "HTTP Request")
   - Delete it and recreate as HTTP Request

## 🤖 Automated Setup (Management API)

### Option A: Using the script

```bash
# 1. Get your Management API token
# Go to: https://supabase.com/dashboard/account/tokens
# Create new token with "full access"

# 2. Set environment variables
export SUPABASE_PROJECT_REF="your-project-ref"
export SUPABASE_ACCESS_TOKEN="sbp_xxxxxxxxxx"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."

# 3. Run the script
chmod +x scripts/create-webhook-api.sh
./scripts/create-webhook-api.sh
```

### Option B: Direct curl

```bash
PROJECT_REF="your-ref"
ACCESS_TOKEN="sbp_xxxx"
SERVICE_ROLE_KEY="eyJxxx..."

curl -X POST "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/webhooks" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "process-signer-signed-webhook",
    "type": "http_request",
    "events": {
      "insert": true,
      "update": false,
      "delete": false
    },
    "config": {
      "schema": "public",
      "table": "workflow_events",
      "filter": "event_type=eq.signer.signed",
      "method": "POST",
      "url": "https://'"${PROJECT_REF}"'.supabase.co/functions/v1/process-signer-signed",
      "headers": {
        "Content-Type": "application/json",
        "apikey": "'"${SERVICE_ROLE_KEY}"'"
      },
      "body": "{ \"record\": {{ record }} }"
    }
  }'
```

## 🔍 Debugging Checklist

If webhook still doesn't fire:

- [ ] Type is "HTTP Request" (not "Edge Function")
- [ ] Table is `public.workflow_events`
- [ ] Event is `INSERT` (only)
- [ ] Filter is `event_type=eq.signer.signed`
- [ ] URL is correct (check PROJECT_REF)
- [ ] Header `apikey` has SERVICE_ROLE_KEY (not anon key)
- [ ] Body has `{{ record }}` (not `{ record }`)
- [ ] Webhook is **enabled** (green toggle)
- [ ] You can see the webhook in Delivery Logs section
- [ ] Test insert actually creates a row with `event_type='signer.signed'`

## 📚 Why This Matters

Your Edge Function `/home/manu/dev/ecosign/supabase/functions/process-signer-signed/index.ts:29` expects:

```typescript
const body = await req.json()
// Supabase DB Webhooks send a full payload with the inserted record under `record`.
const eventTypeFromPayload = body?.record?.event_type || body?.event_type
```

It's designed to accept the webhook payload with `{ record: {...} }`.

The "HTTP Request" webhook type sends exactly that.
The "Edge Function" type does NOT (unreliable, undocumented payload).

## 🎯 Bottom Line

**Always use "HTTP Request" webhooks**, even when calling Edge Functions.

The "Edge Function" type is a legacy/experimental feature that fails silently.
