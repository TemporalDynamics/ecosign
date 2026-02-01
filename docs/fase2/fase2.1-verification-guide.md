# Fase 2.1 Verification Guide

## Overview

This guide provides step-by-step verification procedures for the correlation_id and trace_id implementation.

## Pre-requisites

1. Apply the migration:
```bash
# Using Supabase CLI
supabase db push

# Or apply manually
psql $DATABASE_URL -f supabase/migrations/20260131180000_add_correlation_trace_ids_to_executor_jobs.sql
```

2. Verify schema changes:
```sql
-- Check columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'executor_jobs'
  AND column_name IN ('correlation_id', 'trace_id');

-- Expected output:
-- correlation_id | text
-- trace_id       | text

-- Check indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'executor_jobs'
  AND indexname LIKE '%correlation%';

-- Expected: executor_jobs_correlation_id_idx
```

## Verification Tests

### Test 1: Job Creation with correlation_id

**Goal**: Verify that new jobs are created with correlation_id set.

```bash
# 1. Create a protection request (adjust URL and keys)
curl -X POST https://your-project.supabase.co/functions/v1/record-protection-event \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "test-doc-123",
    "flow_version": "v2",
    "protection_details": {
      "forensic_enabled": true,
      "tsa_requested": true,
      "polygon_requested": true
    }
  }'

# 2. Get the document_entity_id from response
ENTITY_ID="<from-response>"

# 3. Query executor_jobs
psql $DATABASE_URL -c "
SELECT id, type, correlation_id, trace_id, entity_id, status
FROM executor_jobs
WHERE entity_id = '$ENTITY_ID'
ORDER BY created_at DESC
LIMIT 5;
"
```

**Expected**:
- Initial job has `correlation_id = entity_id`
- `trace_id IS NULL` (generated during execution)
- Job type is `protect_document_v2`

### Test 2: trace_id Generation During Execution

**Goal**: Verify that orchestrator generates trace_id when processing jobs.

```bash
# 1. Trigger orchestrator
curl -X POST https://your-project.supabase.co/functions/v1/orchestrator

# 2. Check job trace_id
psql $DATABASE_URL -c "
SELECT id, type, correlation_id, trace_id, status, attempts
FROM executor_jobs
WHERE entity_id = '$ENTITY_ID'
  AND status IN ('processing', 'succeeded')
ORDER BY created_at DESC
LIMIT 5;
"
```

**Expected**:
- Jobs that were processed have `trace_id` matching pattern: `UUID-jobId-attempt`
- Example: `a1b2c3d4-e5f6-...-abc123-1`

### Test 3: Downstream Job Propagation

**Goal**: Verify that downstream jobs inherit correlation_id.

```bash
# Wait for fase1-executor to create downstream jobs
sleep 5

# Query all jobs for the document
psql $DATABASE_URL -c "
SELECT
  id,
  type,
  correlation_id,
  trace_id,
  status,
  attempts,
  created_at
FROM executor_jobs
WHERE correlation_id = '$ENTITY_ID'
ORDER BY created_at ASC;
"
```

**Expected**:
- All jobs have same `correlation_id` (the entity_id)
- Multiple job types: `protect_document_v2`, `run_tsa`, `submit_anchor_polygon`, `build_artifact`
- Each job has unique `trace_id` when executed

### Test 4: Structured Logging Verification

**Goal**: Verify that orchestrator logs include correlation_id and trace_id.

```bash
# Check orchestrator logs (using Supabase dashboard or CLI)
supabase functions logs orchestrator --tail

# Or query directly
curl -X POST https://your-project.supabase.co/functions/v1/orchestrator
```

**Expected log format**:
```json
{
  "timestamp": "2026-01-31T18:00:00.000Z",
  "level": "info",
  "message": "Job processing started",
  "context": {
    "jobId": "abc-123",
    "type": "run_tsa",
    "documentEntityId": "doc-entity-456",
    "correlation_id": "doc-entity-456",
    "trace_id": "run-instance-abc-123-1",
    "attempt": 1
  }
}
```

### Test 5: Event correlation_id Propagation

**Goal**: Verify that events include correlation_id inherited from jobs.

```sql
-- Query document_entities events
SELECT
  id,
  events
FROM document_entities
WHERE id = '$ENTITY_ID';

-- Extract events with correlation_id
SELECT
  evt->>'kind' as event_kind,
  evt->>'correlation_id' as correlation_id,
  evt->>'at' as event_timestamp
FROM document_entities,
  jsonb_array_elements(events) as evt
WHERE id = '$ENTITY_ID'
ORDER BY evt->>'at' DESC;
```

**Expected**:
- All events have `correlation_id` field
- All correlation_ids match the entity_id
- Event kinds include: `document.protected.requested`, `tsa.confirmed`, `anchor.pending`, `artifact.finalized`

### Test 6: End-to-End Tracing Query

**Goal**: Trace complete document flow using correlation_id.

```sql
-- Get all jobs and events for a document
WITH document_jobs AS (
  SELECT
    id as job_id,
    type as job_type,
    correlation_id,
    trace_id,
    status,
    attempts,
    created_at as job_created_at,
    updated_at as job_updated_at
  FROM executor_jobs
  WHERE correlation_id = '$ENTITY_ID'
),
document_events AS (
  SELECT
    evt->>'kind' as event_kind,
    evt->>'correlation_id' as correlation_id,
    evt->>'at' as event_timestamp
  FROM document_entities,
    jsonb_array_elements(events) as evt
  WHERE id = '$ENTITY_ID'
)
SELECT
  'job' as source,
  job_type as type,
  correlation_id,
  trace_id,
  status,
  job_created_at as timestamp
FROM document_jobs
UNION ALL
SELECT
  'event' as source,
  event_kind as type,
  correlation_id,
  NULL as trace_id,
  NULL as status,
  event_timestamp::timestamptz as timestamp
FROM document_events
ORDER BY timestamp ASC;
```

**Expected**:
- Complete timeline of jobs and events
- All entries share same correlation_id
- Jobs have unique trace_ids
- Events inherit correlation_id from originating job

### Test 7: Incident Response Query

**Goal**: Verify that correlation_id enables fast incident investigation.

```sql
-- Find all jobs for a stuck document
SELECT
  id,
  type,
  status,
  attempts,
  max_attempts,
  last_error,
  created_at,
  updated_at
FROM executor_jobs
WHERE correlation_id = '$ENTITY_ID'
  AND status IN ('failed', 'retry_scheduled', 'dead')
ORDER BY created_at DESC;

-- Check execution history for a specific job
SELECT
  job_id,
  status,
  attempt,
  worker_id,
  started_at,
  finished_at,
  duration_ms,
  error
FROM executor_job_runs
WHERE job_id IN (
  SELECT id FROM executor_jobs WHERE correlation_id = '$ENTITY_ID'
)
ORDER BY started_at DESC;
```

**Expected**:
- Quick identification of failed jobs for document
- Complete execution history with errors
- Performance metrics (duration_ms)

## Performance Verification

### Test 8: Index Efficiency

```sql
-- Verify index is used for correlation_id queries
EXPLAIN ANALYZE
SELECT *
FROM executor_jobs
WHERE correlation_id = '$ENTITY_ID';

-- Expected: Index Scan using executor_jobs_correlation_id_idx
```

### Test 9: Query Performance

```sql
-- Benchmark correlation_id queries
\timing on

SELECT count(*)
FROM executor_jobs
WHERE correlation_id = '$ENTITY_ID';

-- Should be < 10ms for typical workloads
```

## Regression Tests

### Test 10: Backward Compatibility

**Goal**: Verify system handles jobs without correlation_id (legacy data).

```sql
-- Query jobs without correlation_id
SELECT count(*)
FROM executor_jobs
WHERE correlation_id IS NULL;

-- These should still be processable using entity_id fallback
```

## Success Criteria

- ✅ All new jobs have `correlation_id` set
- ✅ Orchestrator generates unique `trace_id` for each execution
- ✅ Downstream jobs inherit `correlation_id` from parent
- ✅ All logs include both `correlation_id` and `trace_id`
- ✅ All events include `correlation_id` from originating job
- ✅ Query `WHERE correlation_id = X` returns complete job chain
- ✅ Index is used for correlation_id queries (< 10ms)
- ✅ No console.log in orchestrator (all structured)

## Troubleshooting

### Issue: Jobs missing correlation_id

**Cause**: Job created before migration applied.

**Fix**: Backfill legacy jobs:
```sql
UPDATE executor_jobs
SET correlation_id = entity_id
WHERE correlation_id IS NULL;
```

### Issue: Events missing correlation_id

**Cause**: Worker function not updated to propagate correlation_id.

**Check**: Verify worker receives correlation_id in request:
```typescript
// In worker function
console.log('Request body:', body);
// Should include correlation_id field
```

### Issue: trace_id not generated

**Cause**: Orchestrator not updated or migration not applied.

**Check**:
1. Verify migration applied: `\d executor_jobs`
2. Check orchestrator logs for trace_id generation
3. Verify RPC returns trace_id field

### Issue: Logs not structured

**Cause**: Logger not imported or console.log still used.

**Fix**: Search and replace:
```bash
# Find remaining console.log in orchestrator
grep -n "console.log" supabase/functions/orchestrator/index.ts

# Should return 0 results
```

## Next Steps

Once verification passes:
- Deploy to production
- Monitor correlation_id coverage (should reach 100% within 24h)
- Update health endpoint to use correlation_id queries (Fase 2.2)
- Enable incident response workflows using correlation_id
