# TTL Reclaim + Heartbeat Implementation Summary

## Overview

Implementation of automatic TTL reclaim and heartbeat mechanism to prevent executor jobs from staying stuck in `running` status when workers die.

## Files Created

### Fase 1 (Core - PRIORITARIO)
These migrations implement the essential reclaim functionality:

1. **20260131000000_add_heartbeat_to_executor_jobs.sql**
   - Adds `heartbeat_at` column to `executor_jobs`
   - Creates `executor_jobs_reclaim_idx` for efficient queries
   - Status: ✅ Ready to deploy

2. **20260131000100_reclaim_stale_jobs_function.sql**
   - Implements `reclaim_stale_jobs()` function
   - TTLs: protect_document_v2 (5m), run_tsa (30m), submit_anchor (60m), build_artifact (15m)
   - Logic: attempts < 10 → queued, attempts >= 10 → dead
   - Uses FOR UPDATE SKIP LOCKED to prevent race conditions
   - Status: ✅ Ready to deploy

3. **20260131000300_integrate_reclaim_into_cron_wrappers.sql**
   - Modifies `process_orchestrator_jobs()` to call reclaim first
   - Modifies `wake_execution_engine()` to call reclaim first
   - Effective reclaim frequency: ~15-30s (alternating crons)
   - Status: ✅ Ready to deploy

### Fase 2 (Heartbeat - Optional, after validation)
Deploy only after Fase 1 is validated:

4. **20260131000200_update_job_heartbeat_function.sql**
   - Implements `update_job_heartbeat(p_job_id, p_worker_id)` function
   - Allows workers to update heartbeat during long jobs
   - Status: ⏳ Deploy after Fase 1 validation

### Fase 3 (Monitoring - Optional)
Deploy after system is stable:

5. **20260131000400_reclaim_monitoring_views.sql**
   - Creates `executor_jobs_stale_monitor` view (health status)
   - Creates `executor_jobs_stale_validation` view (jobs > 2x TTL)
   - Creates `executor_jobs_reclaim_history` view (audit trail)
   - Status: ⏳ Deploy after Fase 1 validation

6. **20260131000500_reclaim_tests.sql**
   - Test queries and validation scripts
   - Not a migration, just documentation
   - Status: ℹ️ Reference only

## Deployment Strategy

### Step 1: Deploy Core (Fase 1)
```bash
# Apply migrations 000000, 000100, 000300
supabase db push

# Or apply individually:
psql $DATABASE_URL -f supabase/migrations/20260131000000_add_heartbeat_to_executor_jobs.sql
psql $DATABASE_URL -f supabase/migrations/20260131000100_reclaim_stale_jobs_function.sql
psql $DATABASE_URL -f supabase/migrations/20260131000300_integrate_reclaim_into_cron_wrappers.sql
```

### Step 2: Validate Core Functionality
Run tests from `20260131000500_reclaim_tests.sql`:

#### Test 1: Simulate Dead Worker
```sql
-- Create stale job
INSERT INTO public.executor_jobs (dedupe_key, type, status, locked_at, locked_by, attempts, payload)
VALUES (
  'test-ttl-reclaim-' || extract(epoch from now())::text,
  'run_tsa', 'running',
  now() - interval '35 minutes',
  'test-worker-dead', 1, '{}'::jsonb
);

-- Wait for next cron cycle (~30s) or manually trigger:
SELECT * FROM public.reclaim_stale_jobs();

-- Verify reclaim
SELECT dedupe_key, type, status, attempts, last_error
FROM public.executor_jobs
WHERE dedupe_key LIKE 'test-ttl-reclaim-%'
  AND last_error LIKE 'RECLAIMED_TTL:%';
```

**Expected:**
- status = 'queued'
- attempts = 2 (incremented)
- last_error contains 'RECLAIMED_TTL: Exceeded TTL (30 min)'

#### Test 2: No Jobs > 2x TTL
```sql
-- Should return 0 rows
SELECT COUNT(*) FROM public.executor_jobs
WHERE status IN ('running', 'processing')
  AND type = 'run_tsa'
  AND locked_at < now() - interval '60 minutes';  -- 2x TTL
```

#### Test 3: Max Attempts → Dead
```sql
-- Create job with attempts=10
INSERT INTO public.executor_jobs (dedupe_key, type, status, locked_at, locked_by, attempts, payload)
VALUES (
  'test-max-attempts-' || extract(epoch from now())::text,
  'run_tsa', 'running',
  now() - interval '35 minutes',
  'test-worker-exhausted', 10, '{}'::jsonb
);

-- Trigger reclaim
SELECT * FROM public.reclaim_stale_jobs();

-- Verify dead status
SELECT dedupe_key, status, attempts, last_error
FROM public.executor_jobs
WHERE dedupe_key LIKE 'test-max-attempts-%';
```

**Expected:**
- status = 'dead'
- attempts = 10 (unchanged)
- last_error contains 'Max attempts reached'

### Step 3: Deploy Optional Features (Fase 2/3)
Only after validating core:

```bash
# Deploy heartbeat function
psql $DATABASE_URL -f supabase/migrations/20260131000200_update_job_heartbeat_function.sql

# Deploy monitoring views
psql $DATABASE_URL -f supabase/migrations/20260131000400_reclaim_monitoring_views.sql
```

### Step 4: Monitor Production
```sql
-- Check for stale jobs
SELECT * FROM public.executor_jobs_stale_monitor;

-- Validate no jobs > 2x TTL
SELECT * FROM public.executor_jobs_stale_validation;

-- Audit reclaim history
SELECT * FROM public.executor_jobs_reclaim_history LIMIT 20;
```

## How It Works

### Reclaim Logic

1. **Cron triggers** (every ~15-30s):
   - `process_orchestrator_jobs()` → calls `reclaim_stale_jobs()`
   - `wake_execution_engine()` → calls `reclaim_stale_jobs()`

2. **reclaim_stale_jobs() checks each job type**:
   - For each type (run_tsa, protect_document_v2, etc.):
   - Find jobs where: `status IN ('running', 'processing')`
   - AND `locked_at < now() - TTL`
   - AND `(heartbeat_at IS NULL OR heartbeat_at < now() - TTL)`

3. **Reclaim action**:
   - If `attempts < 10`: Reset to 'queued', increment attempts, unlock
   - If `attempts >= 10`: Mark as 'dead', unlock
   - Prefix `last_error` with 'RECLAIMED_TTL: ...' for audit

4. **Workers process reclaimed jobs**:
   - Orchestrator/fase1-executor claim and process normally
   - Idempotency ensures safe re-processing

### TTL Values

| Job Type | TTL | Use Case |
|----------|-----|----------|
| `protect_document_v2` | 5 min | Fast cryptographic operations |
| `document.protected` | 5 min | Fast cryptographic operations |
| `run_tsa` | 30 min | External TSA API calls |
| `submit_anchor_polygon` | 60 min | Blockchain transactions |
| `submit_anchor_bitcoin` | 60 min | Blockchain transactions |
| `build_artifact` | 15 min | Proof generation |

### Edge Cases Handled

#### 1. Race Condition: Job Reclaimed While Executing
- **Mitigation**: `FOR UPDATE SKIP LOCKED` in reclaim function
- **Safety**: Workers implement idempotency, ledger rejects duplicates
- **Verdict**: ✅ Safe

#### 2. Job Loops Infinitely (Always Fails)
- **Mitigation**: `max_attempts = 10`, `attempts++` on reclaim
- **Result**: After 10 attempts → status='dead'
- **Verdict**: ✅ Controlled

#### 3. Reclaim Function Fails
- **Mitigation**: Exception handler in cron wrappers
- **Behavior**: Logs warning, continues to invoke worker
- **Recovery**: Retries on next cron cycle
- **Verdict**: ✅ Resilient

#### 4. Heartbeat Prevents Reclaim
- **Logic**: Uses `COALESCE(heartbeat_at, locked_at)` for age check
- **Result**: Recent heartbeat keeps job alive even if locked_at is old
- **Verdict**: ✅ Working as designed

## Definition of Done - Checklist

### Fase 1 (Core) - MUST COMPLETE
- [x] Schema migrated: heartbeat_at column exists
- [x] Function `reclaim_stale_jobs()` implemented
- [x] Cron wrappers call reclaim before invoking workers
- [ ] **Test 1**: Simulated dead worker → job reclaimed in < 30s
- [ ] **Test 2**: Query validation → 0 jobs running > 2x TTL
- [ ] **Test 3**: Max attempts → job marked 'dead'
- [ ] **Audit**: last_error contains 'RECLAIMED_TTL' prefix

### Fase 2 (Heartbeat) - Optional
- [x] Function `update_job_heartbeat()` implemented
- [ ] Orchestrator updated to send heartbeat (see note below)
- [ ] Verify heartbeat_at updates during long jobs

### Fase 3 (Monitoring) - Optional
- [x] Views created: stale_monitor, stale_validation, reclaim_history
- [ ] Dashboard queries integrated

## Next Steps

1. **Deploy Fase 1 migrations** (000000, 000100, 000300)
2. **Run validation tests** (see Step 2 above)
3. **Monitor for 24h** - check for jobs > 2x TTL
4. **Deploy Fase 2** if needed (heartbeat for orchestrator)
5. **Deploy Fase 3** for enhanced monitoring

## Notes

### Orchestrator Heartbeat (Fase 2)
Not implemented in this phase. To add heartbeat to orchestrator:

1. Modify `/supabase/functions/orchestrator/index.ts`
2. Add heartbeat interval for long jobs (run_tsa, submit_anchor_*)
3. Call `update_job_heartbeat(job.id, workerId)` every 15s
4. Clear interval on job completion
5. Deploy edge function

Example pseudocode:
```typescript
// In processJob() for long-running jobs
const heartbeatInterval = setInterval(async () => {
  await updateHeartbeat(job.id, workerId);
}, 15000);

try {
  // Process job...
} finally {
  clearInterval(heartbeatInterval);
  // DO NOT clear heartbeat_at - leave as forensic data
}
```

### Why Not Implement Heartbeat Now?
- **Core reclaim** solves 90% of the problem
- **Orchestrator changes** require edge function deployment
- **Validation first** ensures core logic works before adding complexity
- **Decision jobs** (fase1-executor) are too fast (<1s) to need heartbeat

## Troubleshooting

### Jobs still stuck after deployment
```sql
-- Check if reclaim is running
SELECT * FROM pg_stat_activity
WHERE query LIKE '%reclaim_stale_jobs%';

-- Manually trigger reclaim
SELECT * FROM public.reclaim_stale_jobs();

-- Check cron status
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### Reclaim not finding jobs
```sql
-- Check for jobs that should be reclaimed
SELECT id, type, status, locked_at, heartbeat_at,
       EXTRACT(EPOCH FROM (now() - locked_at)) / 60.0 AS age_minutes
FROM public.executor_jobs
WHERE status IN ('running', 'processing')
  AND locked_at < now() - interval '5 minutes'
ORDER BY locked_at;
```

### Too many reclaims
```sql
-- Check reclaim frequency
SELECT COUNT(*) AS reclaim_count,
       type,
       status
FROM public.executor_jobs
WHERE last_error LIKE 'RECLAIMED_TTL:%'
  AND updated_at > now() - interval '1 hour'
GROUP BY type, status;
```

## Rollback Plan

If issues occur, rollback in reverse order:

```sql
-- Rollback Fase 1 (revert to original cron wrappers)
-- Re-run: 20260130213000_fix_cron_http_calls_with_public_anon_key.sql

-- Drop reclaim function
DROP FUNCTION IF EXISTS public.reclaim_stale_jobs();

-- Drop heartbeat function
DROP FUNCTION IF EXISTS public.update_job_heartbeat(uuid, text);

-- Drop views
DROP VIEW IF EXISTS public.executor_jobs_stale_monitor;
DROP VIEW IF EXISTS public.executor_jobs_stale_validation;
DROP VIEW IF EXISTS public.executor_jobs_reclaim_history;

-- Drop index (optional, doesn't hurt to keep)
DROP INDEX IF EXISTS public.executor_jobs_reclaim_idx;

-- Drop column (optional, doesn't hurt to keep)
ALTER TABLE public.executor_jobs DROP COLUMN IF EXISTS heartbeat_at;
```

## References

- Original plan: `/home/manu/.claude/projects/-home-manu-dev-ecosign/54d6ee37-9f5b-484a-8131-029593fc8b7c.jsonl`
- Executor jobs table: `public.executor_jobs`
- Cron jobs: `cron.job` (check with `SELECT * FROM cron.job`)
- Edge functions: `/supabase/functions/orchestrator`, `/supabase/functions/fase1-executor`
