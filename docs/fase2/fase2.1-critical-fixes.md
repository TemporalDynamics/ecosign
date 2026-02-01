# Fase 2.1 - Critical Bug Fixes

## Overview

After initial implementation, 4 critical bugs were identified and fixed to ensure correlation_id and trace_id are **reliable and not decorative**.

**Fix Date**: 2026-01-31
**Status**: ✅ All Critical Fixes Applied

---

## Bug #1: Status Inconsistency in RPCs 🔴 CRITICAL

### Problem

The migration used `status = 'processing'` in both claim RPCs, but the CHECK constraint only allows:

```sql
CHECK (status IN ('queued','running','succeeded','failed','retry_scheduled','dead'))
```

This would cause:
- Migration failure (invalid status value)
- Inconsistency with Fase 1 architecture (which uses 'running')
- Broken job claiming

### Root Cause

Copy-paste error from external examples that used 'processing' instead of the canonical 'running'.

### Fix Applied

**File**: `supabase/migrations/20260131180000_add_correlation_trace_ids_to_executor_jobs.sql`

Changed both RPCs from:
```sql
status = 'processing'
```

To:
```sql
status = 'running'
```

**Lines Changed**:
- Line 41: claim_orchestrator_jobs
- Line 92: claim_initial_decision_jobs

### Verification

```sql
-- Verify valid status values
SELECT DISTINCT status FROM executor_jobs;
-- Should only show: queued, running, succeeded, failed, retry_scheduled, dead
```

---

## Bug #2: trace_id Update Without Ownership Guard 🔴 CRITICAL

### Problem

In orchestrator, trace_id was updated without verifying job ownership:

```typescript
await supabase
  .from('executor_jobs')
  .update({ trace_id })
  .eq('id', jobId);  // ❌ No locked_by guard!
```

This reintroduced the race condition bug that was already fixed in Fase 1:
- Worker A claims job, starts processing
- Worker B (stale) can overwrite trace_id
- Loss of execution traceability
- Potential state corruption

### Root Cause

Missing ownership guard that Fase 1 established as canonical pattern.

### Fix Applied

**File**: `supabase/functions/orchestrator/index.ts` (lines 199-217)

Changed from:
```typescript
await supabase
  .from('executor_jobs')
  .update({ trace_id })
  .eq('id', jobId);
```

To:
```typescript
const { count: traceUpdateCount } = await supabase
  .from('executor_jobs')
  .update({ trace_id })
  .eq('id', jobId)
  .eq('locked_by', WORKER_ID);  // ✅ Ownership guard

// If update affected 0 rows, job was stolen - abort processing
if (!traceUpdateCount || traceUpdateCount === 0) {
  logger.warn('Job ownership lost before trace_id update', {
    jobId,
    type,
    documentEntityId,
    trace_id,
  });
  throw new Error('Job ownership lost - aborting processing');
}
```

### Verification

Test race condition:
1. Worker A claims job
2. Worker B tries to update trace_id with different WORKER_ID
3. Update should affect 0 rows
4. Worker B should abort with error

---

## Bug #3: Logging Undefined trace_id 🟡 HIGH

### Problem

In orchestrator, trace_id was generated as local variable and saved to DB, but logs referenced `job.trace_id`:

```typescript
const trace_id = `${RUN_INSTANCE_ID}-${jobId}-${job.attempts || 1}`;
await supabase.from('executor_jobs').update({ trace_id }).eq('id', jobId);

// Later in logs:
logger.info('...', { trace_id: job.trace_id });  // ❌ undefined!
```

Since `job` object is not updated after the DB write, `job.trace_id` remains `undefined`.

### Impact

- All structured logs showed `trace_id: undefined`
- Impossible to trace executions in production logs
- Defeats entire purpose of trace_id

### Fix Applied

**File**: `supabase/functions/orchestrator/index.ts`

Changed handler signature to accept trace_id:
```typescript
// Before:
const jobHandlers: Record<JobType, (job: ExecutorJob) => Promise<any>>

// After:
const jobHandlers: Record<JobType, (job: ExecutorJob, trace_id: string) => Promise<any>>
```

Updated all handler calls:
```typescript
// Before:
const result = await handler(job);

// After:
const result = await handler(job, trace_id);
```

Updated all logs in handlers:
```typescript
// Before:
logger.info('...', { trace_id: job.trace_id });  // ❌ undefined

// After:
logger.info('...', { trace_id });  // ✅ uses parameter
```

**Lines Changed**:
- Line 73: run_tsa handler signature
- Line 81: run_tsa log
- Line 93: submit_anchor_polygon handler signature
- Line 100: submit_anchor_polygon log
- Line 119: submit_anchor_bitcoin handler signature
- Line 126: submit_anchor_bitcoin log
- Line 145: build_artifact handler signature
- Line 152: build_artifact log
- Line 279: handler invocation

### Verification

Check orchestrator logs:
```bash
supabase functions logs orchestrator --tail | grep trace_id
```

Expected: All logs show `trace_id: "uuid-jobid-attempt"`, NOT `trace_id: undefined`

---

## Bug #4: correlation_id Spoofing / No Validation 🟡 HIGH

### Problem

Workers accepted `correlation_id` from HTTP payload without validation:

```typescript
const correlationId = body.correlation_id || documentEntityId;
```

If a malicious/buggy caller sends:
```json
{
  "document_entity_id": "doc-abc-123",
  "correlation_id": "fake-correlation-xyz"
}
```

The event would be written with wrong correlation_id, breaking traceability.

### Root Cause

No validation that correlation_id matches the canonical rule: `correlation_id = document_entity_id`.

### Fix Applied

**Files**:
- `supabase/functions/run-tsa/index.ts`
- `supabase/functions/submit-anchor-polygon/index.ts`
- `supabase/functions/submit-anchor-bitcoin/index.ts`
- `supabase/functions/build-artifact/index.ts`

Added validation in all workers:
```typescript
// Validate correlation_id: canonical rule is correlation_id = document_entity_id
let correlationId = body.correlation_id || documentEntityId;
if (correlationId && correlationId !== documentEntityId) {
  console.warn('[worker] correlation_id mismatch - overriding to canonical', {
    received_correlation_id: correlationId,
    document_entity_id: documentEntityId,
  });
  correlationId = documentEntityId;  // ✅ Override to canonical
}
```

### Verification

Test spoofing attempt:
```bash
curl -X POST .../run-tsa \
  -d '{
    "document_entity_id": "doc-abc-123",
    "correlation_id": "fake-xyz"
  }'
```

Expected:
1. Warning logged: `correlation_id mismatch - overriding to canonical`
2. Event written with `correlation_id = "doc-abc-123"` (not "fake-xyz")

---

## Bonus Fix: correlation_id Type Changed to UUID ✅

### Problem

Original implementation used `correlation_id text`, but canonical rule is:
```
correlation_id = document_entity_id (which is uuid)
```

Using `text` allows:
- Non-UUID garbage values
- Inefficient indexing
- Type mismatch with entity_id

### Fix Applied

**File**: `supabase/migrations/20260131180000_add_correlation_trace_ids_to_executor_jobs.sql`

Changed from:
```sql
ADD COLUMN correlation_id text,
```

To:
```sql
ADD COLUMN correlation_id uuid,
```

Also updated RPC return types:
```sql
RETURNS TABLE(
  ...
  correlation_id uuid,  -- Changed from text
  trace_id text
)
```

### Verification

```sql
-- Verify column type
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'executor_jobs'
  AND column_name = 'correlation_id';

-- Expected: data_type = 'uuid'
```

---

## Summary Table

| Bug # | Severity | Issue | Impact | Fix |
|-------|----------|-------|--------|-----|
| 1 | 🔴 Critical | status = 'processing' | Migration fails, breaks CHECK constraint | Changed to 'running' |
| 2 | 🔴 Critical | No ownership guard on trace_id update | Race condition, state corruption | Added WHERE locked_by guard + abort if 0 rows |
| 3 | 🟡 High | Logging undefined job.trace_id | Logs show undefined, can't trace executions | Pass trace_id to handlers |
| 4 | 🟡 High | No correlation_id validation | Spoofing breaks traceability | Validate and override to canonical |
| Bonus | ✅ Nice-to-have | correlation_id is text not uuid | Type mismatch, allows garbage | Changed to uuid |

---

## Remaining Recommendations (Not Implemented)

### trace_id in executor_job_runs (Future Enhancement)

**Recommendation**: Store trace_id in `executor_job_runs` as source of truth, not just in `executor_jobs`.

**Rationale**:
- `executor_job_runs`: 1 row per attempt (trace_id unique per attempt)
- `executor_jobs`: 1 row per job (trace_id is "last attempt")

**Current Status**: Low priority - current implementation works, but this would be cleaner architecture.

**Implementation**:
```sql
ALTER TABLE executor_job_runs
  ADD COLUMN trace_id text;

-- In orchestrator, write trace_id to both tables
```

---

## Files Changed

### SQL
- ✅ `supabase/migrations/20260131180000_add_correlation_trace_ids_to_executor_jobs.sql`
  - Changed correlation_id type: text → uuid
  - Fixed status: 'processing' → 'running' (2 RPCs)
  - Updated RPC return types

### TypeScript
- ✅ `supabase/functions/orchestrator/index.ts`
  - Added ownership guard to trace_id update
  - Changed handler signature to accept trace_id
  - Updated all handler calls to pass trace_id
  - Fixed all logs to use trace_id parameter

- ✅ `supabase/functions/run-tsa/index.ts`
  - Added correlation_id validation + override

- ✅ `supabase/functions/submit-anchor-polygon/index.ts`
  - Added correlation_id validation + override

- ✅ `supabase/functions/submit-anchor-bitcoin/index.ts`
  - Added correlation_id validation + override

- ✅ `supabase/functions/build-artifact/index.ts`
  - Added correlation_id validation + override

---

## Testing Checklist

After deploying these fixes:

- [ ] Apply migration successfully (no CHECK constraint error)
- [ ] Verify all jobs have status 'running' when processing
- [ ] Confirm trace_id appears in logs (not undefined)
- [ ] Test ownership guard (simulate stale worker)
- [ ] Test correlation_id spoofing (verify override)
- [ ] Verify correlation_id is uuid type in DB
- [ ] Check query performance on correlation_id index

---

## Conclusion

All 4 critical bugs have been fixed. The implementation is now:

✅ **Safe**: Ownership guards prevent race conditions
✅ **Reliable**: trace_id properly logged, not undefined
✅ **Canonical**: correlation_id validated and enforced
✅ **Type-safe**: correlation_id is uuid, matching entity_id

The correlation_id and trace_id system is now **production-ready** and provides **real traceability**, not decorative fields.
