# Fase 2.2 - Dead Jobs Endpoint

## Overview

Endpoint para diagnosticar jobs en estado 'dead' con contexto suficiente para responder en < 2 minutos: "¿Qué se rompió y dónde?"

**Implementation Date**: 2026-01-31
**Status**: ✅ Complete

---

## Objetivo (Roadmap)

> "Lista dead jobs con reason, attempts, locked_at/locked_by."
> — docs/90-archive/2026-01-31-snapshot/02-orphaned-root/ROADMAP_DEFINITIVO_INFALIBLE.md:84

---

## Endpoint

```
GET /functions/v1/dead-jobs
```

### Authentication

**Requiere service_role** (no público)

```bash
curl "https://your-project.supabase.co/functions/v1/dead-jobs" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### Query Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `limit` | number | 50 | 500 | Máximo número de jobs a retornar |
| `since_hours` | number | 24 | - | Jobs muertos en las últimas N horas |
| `type` | string | - | - | Filtrar por tipo de job (ej: 'run_tsa') |
| `correlation_id` | string | - | - | Filtrar por documento específico |

### Examples

```bash
# All dead jobs (last 24h)
GET /dead-jobs

# Last 100 dead jobs from last 48h
GET /dead-jobs?limit=100&since_hours=48

# Dead TSA jobs only
GET /dead-jobs?type=run_tsa

# All dead jobs for specific document
GET /dead-jobs?correlation_id=550e8400-e29b-41d4-a716-446655440000
```

---

## Response Format

```typescript
interface DeadJobReport {
  summary: {
    total_dead: number;
    by_type: Record<string, number>;
    by_reason: Record<string, number>;
    query_params: {
      limit: number;
      since_hours: number;
      type?: string;
      correlation_id?: string;
    };
  };
  jobs: Array<{
    job_id: string;
    type: string;
    entity_id: string;
    correlation_id: string | null;
    trace_id: string | null;

    status: string;
    attempts: number;
    max_attempts: number;

    locked_at: string | null;
    locked_by: string | null;
    heartbeat_at: string | null;

    reason: 'ttl_exceeded' | 'max_attempts_exceeded' | 'handler_error' | 'precondition_failed';

    created_at: string;
    updated_at: string;  // Usar como "dead_at" práctico
    run_at: string;

    last_error: string | null;
  }>;
}
```

---

## Response Examples

### No Dead Jobs

```json
{
  "summary": {
    "total_dead": 0,
    "by_type": {},
    "by_reason": {},
    "query_params": {
      "limit": 50,
      "since_hours": 24
    }
  },
  "jobs": []
}
```

### Dead Jobs Found

```json
{
  "summary": {
    "total_dead": 3,
    "by_type": {
      "run_tsa": 2,
      "submit_anchor_polygon": 1
    },
    "by_reason": {
      "max_attempts_exceeded": 2,
      "ttl_exceeded": 1
    },
    "query_params": {
      "limit": 50,
      "since_hours": 24
    }
  },
  "jobs": [
    {
      "job_id": "abc-123",
      "type": "run_tsa",
      "entity_id": "doc-456",
      "correlation_id": "doc-456",
      "trace_id": "run-instance-abc-123-10",

      "status": "dead",
      "attempts": 10,
      "max_attempts": 10,

      "locked_at": "2026-01-31T10:00:00.000Z",
      "locked_by": "orchestrator-xyz",
      "heartbeat_at": "2026-01-31T10:05:00.000Z",

      "reason": "max_attempts_exceeded",

      "created_at": "2026-01-31T09:00:00.000Z",
      "updated_at": "2026-01-31T10:10:00.000Z",
      "run_at": "2026-01-31T09:00:00.000Z",

      "last_error": "TSA service timeout after 30s"
    },
    {
      "job_id": "def-456",
      "type": "submit_anchor_polygon",
      "entity_id": "doc-789",
      "correlation_id": "doc-789",
      "trace_id": null,

      "status": "dead",
      "attempts": 8,
      "max_attempts": 10,

      "locked_at": "2026-01-31T08:00:00.000Z",
      "locked_by": "orchestrator-abc",
      "heartbeat_at": null,

      "reason": "ttl_exceeded",

      "created_at": "2026-01-31T06:00:00.000Z",
      "updated_at": "2026-01-31T08:30:00.000Z",
      "run_at": "2026-01-31T06:00:00.000Z",

      "last_error": "RECLAIMED_TTL: job exceeded TTL without heartbeat"
    }
  ]
}
```

---

## Reason Codes

Dead jobs are classified by reason (deterministic derivation from last_error):

| Reason | Criteria | Meaning |
|--------|----------|---------|
| `ttl_exceeded` | `last_error` starts with `RECLAIMED_TTL:` | Job exceeded TTL without heartbeat, reclaimed by stale job mechanism |
| `precondition_failed` | `last_error` starts with `precondition_failed:` or includes `authority_reject:` | Authority/invariant violation (e.g., missing dependency event) |
| `max_attempts_exceeded` | `attempts >= max_attempts` | Job retried maximum times and failed |
| `handler_error` | Default | Generic handler failure (check `last_error` for details) |

---

## Definition of "Dead"

A job is **dead** when:

```sql
status = 'dead'
```

**That's it.** In this codebase, `status='dead'` is a real state (not a "view"):

- CHECK constraint allows it: `supabase/migrations/20260116090000_executor_jobs_and_outbox.sql:22`
- `reclaim_stale_jobs()` sets it: `supabase/migrations/20260131171000_fix_executor_job_processing_status_refs.sql:66`
- Orchestrator sets it when `attempts >= max_attempts`

### Not Dead

Jobs with these statuses are **not dead** (they can recover):

- `queued`: waiting to run
- `running`: currently executing
- `retry_scheduled`: will retry automatically
- `succeeded`: completed successfully
- `failed`: failed but can be manually retried

---

## Use Cases

### 1. Daily Health Check

```bash
# Check if any jobs died in last 24h
curl "/dead-jobs" | jq '.summary.total_dead'

# 0 = healthy
# > 0 = investigate
```

### 2. Incident Response

```bash
# Document stuck? Check its dead jobs
curl "/dead-jobs?correlation_id=doc-entity-id" | jq '.jobs'

# Shows:
# - What job type failed
# - Why it failed (reason)
# - When it died (updated_at)
# - Last error message
```

### 3. Pattern Detection

```bash
# Are TSA jobs dying more than others?
curl "/dead-jobs?since_hours=168" | jq '.summary.by_type'

# Output:
# {
#   "run_tsa": 15,
#   "submit_anchor_polygon": 2
# }
# → TSA service might be degraded
```

### 4. Reason Analysis

```bash
# Why are jobs dying?
curl "/dead-jobs" | jq '.summary.by_reason'

# Output:
# {
#   "ttl_exceeded": 10,
#   "max_attempts_exceeded": 5
# }
# → TTL too aggressive or workers not heartbeating
```

---

## Performance

### Query Strategy

Simple SQL query (no JOIN overhead):

```sql
SELECT *
FROM executor_jobs
WHERE status = 'dead'
  AND updated_at >= now() - interval 'X hours'
ORDER BY updated_at DESC
LIMIT N;
```

### Index Usage

Uses existing index on `status`:
```sql
CREATE INDEX executor_jobs_status_run_at_idx
  ON executor_jobs (status, run_at);
```

### Expected Latency

- < 100ms for typical workloads (< 100 dead jobs)
- < 500ms for heavy workloads (100-500 dead jobs)

### Optimization Path (Future)

If query becomes slow:

1. Add dedicated index: `CREATE INDEX ON executor_jobs (status, updated_at) WHERE status = 'dead';`
2. Move to RPC with JOIN LATERAL to `executor_job_runs` for last error details
3. Materialize dead jobs into separate table (if > 1000 dead jobs)

---

## Monitoring

### Automatic Logging

Endpoint logs when dead jobs are found:

```json
{
  "message": "[dead-jobs] Found dead jobs",
  "total": 5,
  "by_type": { "run_tsa": 3, "submit_anchor_polygon": 2 },
  "by_reason": { "max_attempts_exceeded": 5 }
}
```

### Alerts (Recommended)

Set up alerts based on response:

```bash
# Alert if total_dead > threshold
DEAD_COUNT=$(curl "/dead-jobs" | jq '.summary.total_dead')

if [ "$DEAD_COUNT" -gt 10 ]; then
  echo "ALERT: $DEAD_COUNT dead jobs found!"
  # Send to Slack/PagerDuty/etc
fi
```

### Metrics to Track

- `total_dead` over time (trend)
- `by_type` distribution (which workers fail most)
- `by_reason` distribution (systemic vs random failures)
- Time-to-dead (created_at → updated_at duration)

---

## Troubleshooting

### Issue: 401 Unauthorized

**Cause**: Missing or invalid service_role key

**Fix**:
```bash
curl "/dead-jobs" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### Issue: Empty jobs array but documents stuck

**Cause**: Jobs might be `retry_scheduled` or `running` (not dead yet)

**Check**:
```sql
-- Find stuck running jobs
SELECT *
FROM executor_jobs
WHERE status = 'running'
  AND locked_at < now() - interval '1 hour';
```

### Issue: Too many dead jobs (> 500)

**Solution**: Use pagination with `since_hours`:

```bash
# Last 24h
curl "/dead-jobs?since_hours=24&limit=500"

# Previous 24h
curl "/dead-jobs?since_hours=48&limit=500" | jq '.jobs | map(select(.created_at < "2026-01-30T00:00:00Z"))'
```

---

## What This Endpoint Does NOT Do

🚫 **Does not retry jobs** (that's Fase 4 - manual intervention)
🚫 **Does not fix anything** (diagnosis only)
🚫 **Does not provide UI** (raw JSON for integration)
🚫 **Does not show running/queued jobs** (only dead)

This endpoint **accuses**, it does not **repair**.

---

## Integration Examples

### Slack Bot

```typescript
// Check dead jobs every hour
async function checkDeadJobs() {
  const response = await fetch(
    'https://your-project.supabase.co/functions/v1/dead-jobs',
    {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

  const data = await response.json();

  if (data.summary.total_dead > 0) {
    await postToSlack({
      text: `⚠️ ${data.summary.total_dead} dead jobs found!`,
      attachments: [
        {
          color: 'danger',
          fields: [
            { title: 'By Type', value: JSON.stringify(data.summary.by_type) },
            { title: 'By Reason', value: JSON.stringify(data.summary.by_reason) },
          ],
        },
      ],
    });
  }
}
```

### Grafana Dashboard

```json
{
  "datasource": "HTTP",
  "url": "https://your-project.supabase.co/functions/v1/dead-jobs",
  "headers": {
    "Authorization": "Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
  },
  "jsonPath": "$.summary.total_dead"
}
```

### Status Page

```typescript
// Public status page (aggregate only)
async function getSystemHealth() {
  const deadJobs = await fetchDeadJobs();

  return {
    status: deadJobs.summary.total_dead === 0 ? 'operational' : 'degraded',
    metrics: {
      dead_jobs: deadJobs.summary.total_dead,
    },
  };
}
```

---

## Definition of Done ✅

Can answer in < 2 minutes:

- ✅ **What types** are dying? (`summary.by_type`)
- ✅ **Why** are they dying? (`summary.by_reason`)
- ✅ **Which documents** are affected? (`jobs[].correlation_id`)
- ✅ **Is it systemic** or isolated? (pattern in `by_type` + `by_reason`)

---

## Next Steps (Fase 3+)

With dead jobs visible, you can:

1. **Fase 3**: Implement manual retry/fix mechanisms
2. **Fase 4**: Auto-healing for specific failure patterns
3. **Fase 5**: Dead job archival and cleanup

But first: **see what's dead, understand why.**

---

## Files

- **Endpoint**: `supabase/functions/dead-jobs/index.ts`
- **Docs**: `docs/fase2/fase2.2-dead-jobs-endpoint.md` (this file)

---

## Changelog

- **2026-01-31**: Initial implementation (Fase 2.2)
  - Basic dead jobs listing
  - Reason code derivation
  - Summary aggregation
  - Service role auth
