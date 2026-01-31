# TTL Reclaim - Quick Start Guide

## 🚀 Deploy (Fase 1 - Core Only)

```bash
# Option 1: Apply all migrations
supabase db push

# Option 2: Apply individually (if you need granular control)
psql $DATABASE_URL < supabase/migrations/20260131000000_add_heartbeat_to_executor_jobs.sql
psql $DATABASE_URL < supabase/migrations/20260131000100_reclaim_stale_jobs_function.sql
psql $DATABASE_URL < supabase/migrations/20260131000300_integrate_reclaim_into_cron_wrappers.sql
```

## ✅ Validate

### Test 1: Simulate Dead Worker (30 seconds)
```sql
-- 1. Create stale job
INSERT INTO public.executor_jobs (dedupe_key, type, status, locked_at, locked_by, attempts, payload)
VALUES ('test-reclaim-' || extract(epoch from now())::text, 'run_tsa', 'running',
        now() - interval '35 minutes', 'test-worker-dead', 1, '{}'::jsonb);

-- 2. Trigger reclaim (or wait ~30s for cron)
SELECT * FROM public.reclaim_stale_jobs();

-- 3. Verify reclaimed
SELECT dedupe_key, status, attempts, last_error
FROM public.executor_jobs
WHERE dedupe_key LIKE 'test-reclaim-%';
-- Expected: status='queued', attempts=2, last_error has 'RECLAIMED_TTL'
```

### Test 2: No Zombie Jobs
```sql
-- Should return 0
SELECT COUNT(*) FROM public.executor_jobs
WHERE status IN ('running', 'processing')
  AND locked_at < now() - interval '60 minutes';
```

### Test 3: Max Attempts → Dead
```sql
-- 1. Create exhausted job
INSERT INTO public.executor_jobs (dedupe_key, type, status, locked_at, locked_by, attempts, payload)
VALUES ('test-dead-' || extract(epoch from now())::text, 'run_tsa', 'running',
        now() - interval '35 minutes', 'test-worker-exhausted', 10, '{}'::jsonb);

-- 2. Trigger reclaim
SELECT * FROM public.reclaim_stale_jobs();

-- 3. Verify dead
SELECT dedupe_key, status, attempts FROM public.executor_jobs WHERE dedupe_key LIKE 'test-dead-%';
-- Expected: status='dead', attempts=10
```

## 📊 Monitor (After Deploying Fase 3)

```sql
-- Health check - should be empty or only 'OK'
SELECT * FROM public.executor_jobs_stale_monitor;

-- Critical validation - MUST return 0 rows
SELECT * FROM public.executor_jobs_stale_validation;

-- Audit trail
SELECT * FROM public.executor_jobs_reclaim_history LIMIT 10;
```

## 🔧 Manual Operations

### Manually Trigger Reclaim
```sql
SELECT * FROM public.reclaim_stale_jobs();
```

### Check Reclaim Stats
```sql
-- Jobs reclaimed in last hour
SELECT COUNT(*) AS reclaimed_last_hour
FROM public.executor_jobs
WHERE last_error LIKE 'RECLAIMED_TTL:%'
  AND updated_at > now() - interval '1 hour';
```

### Force Reclaim Specific Job
```sql
-- Reset stuck job to queued (manual override)
UPDATE public.executor_jobs
SET status = 'queued',
    locked_at = NULL,
    locked_by = NULL,
    attempts = attempts + 1,
    last_error = 'MANUAL_RECLAIM: ' || COALESCE(last_error, '')
WHERE dedupe_key = 'your-job-dedupe-key';
```

## 🧹 Cleanup Test Data

```sql
DELETE FROM public.executor_jobs
WHERE dedupe_key LIKE 'test-reclaim-%'
   OR dedupe_key LIKE 'test-dead-%'
   OR dedupe_key LIKE 'test-heartbeat-%'
   OR dedupe_key LIKE 'test-max-attempts-%'
   OR dedupe_key LIKE 'test-ttl-reclaim-%';
```

## 📋 TTL Reference

| Job Type | TTL | 2x TTL (Alert) |
|----------|-----|----------------|
| `protect_document_v2` | 5 min | 10 min |
| `document.protected` | 5 min | 10 min |
| `run_tsa` | 30 min | 60 min |
| `submit_anchor_polygon` | 60 min | 120 min |
| `submit_anchor_bitcoin` | 60 min | 120 min |
| `build_artifact` | 15 min | 30 min |

## 🚨 Troubleshooting

### Problem: Jobs not being reclaimed
```sql
-- Check cron status
SELECT * FROM cron.job WHERE jobname LIKE '%executor%' OR jobname LIKE '%orchestrator%';

-- Check recent cron runs
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Manually trigger to test
SELECT * FROM public.reclaim_stale_jobs();
```

### Problem: Too many reclaims (job failing repeatedly)
```sql
-- Find problematic jobs
SELECT dedupe_key, type, attempts, status, last_error
FROM public.executor_jobs
WHERE attempts >= 5
  AND last_error LIKE 'RECLAIMED_TTL:%'
ORDER BY attempts DESC;

-- Mark as dead to stop retry loop
UPDATE public.executor_jobs
SET status = 'dead'
WHERE dedupe_key = 'problematic-job-key';
```

## 📚 Full Documentation

See `TTL_RECLAIM_IMPLEMENTATION.md` for:
- Complete architecture explanation
- Edge cases and safety mechanisms
- Fase 2 (Heartbeat) deployment
- Rollback procedures
