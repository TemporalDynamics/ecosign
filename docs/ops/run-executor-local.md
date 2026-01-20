# Run Executor Locally

Goal: process `executor_jobs` locally (no pg_cron in local).

## Prereqs
- Supabase local running:
  - `supabase start`
- Service role key from `supabase start` output.

## Step 1: Serve functions locally
```bash
supabase functions serve --no-verify-jwt
```

## Step 2: Invoke the executor
```bash
curl -X POST http://127.0.0.1:54321/functions/v1/fase1-executor \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY_LOCAL>" \
  -d '{"limit":5}'
```

## Step 3: Verify job status
```sql
SELECT id, type, status, attempts, updated_at
FROM executor_jobs
ORDER BY created_at DESC
LIMIT 5;
```
