# Fase 2.1 - Health Endpoint

## Overview

Endpoint de observabilidad agregada para visibilidad operativa del sistema en tiempo real.

**Implementation Date**: 2026-02-01
**Status**: ✅ Complete

---

## Objetivo (Roadmap)

> "Health endpoint completo con métricas del sistema"
> — ROADMAP_DEFINITIVO_INFALIBLE.md (Fase 2.1)

**Principios:**
- **Read-only**: No escribe, no repara, solo observa
- **Cheap**: Queries simples, sin JOINs pesados
- **Fast**: Target < 200ms

---

## Endpoint

```
GET /functions/v1/health
```

### Authentication

**Requiere service_role** (no público)

```bash
curl "https://your-project.supabase.co/functions/v1/health" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

---

## Response Format

```typescript
interface HealthReport {
  // Queue metrics
  jobs_queued: {
    by_type: Record<string, number>;  // e.g., { run_tsa: 5, build_artifact: 2 }
    total: number;
  };

  // Processing metrics
  jobs_processing: {
    count: number;
    avg_age_seconds: number;  // Average time since locked_at
  };

  // Stuck jobs (locked_at > TTL without heartbeat)
  stuck_count: number;

  // Dead jobs (last 24h)
  dead_last_24h: number;

  // 🔥 CRITICAL: System lag (age of oldest queued job)
  estimated_lag_seconds: number;

  // Runtime info
  runtime_version: string;
}
```

---

## Response Examples

### Healthy System

```json
{
  "jobs_queued": {
    "by_type": {
      "run_tsa": 2,
      "build_artifact": 1
    },
    "total": 3
  },
  "jobs_processing": {
    "count": 1,
    "avg_age_seconds": 15
  },
  "stuck_count": 0,
  "dead_last_24h": 0,
  "estimated_lag_seconds": 5,
  "runtime_version": "fase2-unified"
}
```

**Indicators:**
- ✅ `stuck_count = 0` (no jobs stuck)
- ✅ `dead_last_24h = 0` (no recent failures)
- ✅ `estimated_lag_seconds < 60` (processing quickly)

---

### System Under Load

```json
{
  "jobs_queued": {
    "by_type": {
      "run_tsa": 15,
      "submit_anchor_polygon": 8,
      "build_artifact": 3
    },
    "total": 26
  },
  "jobs_processing": {
    "count": 5,
    "avg_age_seconds": 120
  },
  "stuck_count": 0,
  "dead_last_24h": 1,
  "estimated_lag_seconds": 180,
  "runtime_version": "fase2-unified"
}
```

**Indicators:**
- ⚠️ `estimated_lag_seconds = 180` (3 min lag - high load)
- ⚠️ `dead_last_24h = 1` (one failure in 24h - acceptable)
- ✅ `stuck_count = 0` (processing is working, just slow)

**Action**: Scale orchestrator or increase batch size

---

### System Degraded

```json
{
  "jobs_queued": {
    "by_type": {
      "run_tsa": 45
    },
    "total": 45
  },
  "jobs_processing": {
    "count": 3,
    "avg_age_seconds": 1800
  },
  "stuck_count": 2,
  "dead_last_24h": 15,
  "estimated_lag_seconds": 3600,
  "runtime_version": "fase2-unified"
}
```

**Indicators:**
- 🔴 `stuck_count = 2` (jobs not progressing)
- 🔴 `dead_last_24h = 15` (high failure rate)
- 🔴 `estimated_lag_seconds = 3600` (1 hour lag)
- 🔴 `avg_age_seconds = 1800` (30 min avg processing time)

**Action**: Investigate stuck jobs, check external services (TSA, blockchain)

---

## Metrics Explained

### 1. `jobs_queued`

**What**: Jobs waiting to be processed (`status = 'queued'`)

**By type**: Breakdown by job type (run_tsa, submit_anchor_*, build_artifact, etc.)

**Health thresholds**:
- ✅ `total < 10` - Normal
- ⚠️ `total 10-50` - High load
- 🔴 `total > 50` - Saturated

### 2. `jobs_processing`

**What**: Jobs currently being executed (`status = 'running'`)

**count**: Number of jobs in processing state

**avg_age_seconds**: Average time since `locked_at` (how long jobs have been running)

**Health thresholds**:
- ✅ `avg_age_seconds < 300` (< 5 min) - Normal
- ⚠️ `avg_age_seconds 300-1800` (5-30 min) - Slow but acceptable
- 🔴 `avg_age_seconds > 1800` (> 30 min) - Likely stuck

### 3. `stuck_count`

**What**: Jobs that exceeded TTL without heartbeat

**Definition**: A job is stuck if:
- `status = 'running'`
- `locked_at < now - TTL(type)`
- `heartbeat_at < now - TTL(type)` or `heartbeat_at IS NULL`

**TTLs by job type**:
```typescript
protect_document_v2:    5 min
run_tsa:               30 min
submit_anchor_*:       60 min
build_artifact:        15 min
default:               30 min
```

**Health thresholds**:
- ✅ `stuck_count = 0` - Healthy
- 🔴 `stuck_count > 0` - **ALERT** (jobs not progressing)

**Action when stuck_count > 0**:
1. Check orchestrator is running
2. Check external services (TSA, blockchain nodes)
3. Query stuck jobs: `SELECT * FROM executor_jobs WHERE status='running' AND locked_at < now() - interval '30 minutes'`

### 4. `dead_last_24h`

**What**: Jobs that exhausted max_attempts in last 24h

**Definition**: `attempts >= max_attempts AND status IN ('dead', 'failed')`

**Health thresholds**:
- ✅ `dead_last_24h = 0` - Perfect
- ⚠️ `dead_last_24h 1-5` - Acceptable (transient failures)
- 🔴 `dead_last_24h > 5` - **INVESTIGATE** (systemic issue)

**Action when dead_last_24h > 5**:
1. Call `/dead-jobs` endpoint for details
2. Check `by_reason` distribution (ttl_exceeded vs max_attempts_exceeded)
3. Check `by_type` distribution (which jobs are failing)

### 5. `estimated_lag_seconds` 🔥

**What**: Age of the oldest queued job (system processing lag)

**Calculation**: `now() - min(run_at)` for jobs with `status='queued'`

**This is THE critical metric for system health.**

**Health thresholds**:
- ✅ `estimated_lag_seconds < 60` (< 1 min) - Excellent
- ⚠️ `estimated_lag_seconds 60-300` (1-5 min) - Acceptable
- 🔴 `estimated_lag_seconds > 300` (> 5 min) - **DEGRADED**

**Why this matters**:
- First metric to break when system is overloaded
- Direct indicator of user-perceived latency
- Used by canaries (Fase 3) to detect system health

**Action when lag > 300s**:
1. Check `jobs_processing.count` (is orchestrator processing?)
2. Check `stuck_count` (are workers stuck?)
3. Check `jobs_queued.total` (is queue growing?)
4. Scale orchestrator if needed

### 6. `runtime_version`

**What**: Current runtime identifier

**Value**: `"fase2-unified"`

**Purpose**: Track which version of orchestrator is running (useful for gradual rollouts)

---

## Use Cases

### 1. Daily Health Check

```bash
# Quick health check
curl "/health" -H "Authorization: Bearer $KEY" | jq '{
  lag: .estimated_lag_seconds,
  stuck: .stuck_count,
  dead: .dead_last_24h,
  queued: .jobs_queued.total
}'

# Output:
# {
#   "lag": 5,
#   "stuck": 0,
#   "dead": 0,
#   "queued": 3
# }
```

**Healthy if**: lag < 60, stuck = 0, dead < 5

---

### 2. Incident Response

```bash
# System alert fired - what's wrong?
curl "/health" | jq '.'

# Check stuck jobs
if [ "$(jq '.stuck_count' <<< "$HEALTH")" -gt 0 ]; then
  echo "🔴 STUCK JOBS DETECTED"
  # Query stuck jobs in SQL
fi

# Check dead jobs
if [ "$(jq '.dead_last_24h' <<< "$HEALTH")" -gt 5 ]; then
  echo "🔴 HIGH FAILURE RATE"
  curl "/dead-jobs" | jq '.summary'
fi

# Check lag
LAG=$(jq '.estimated_lag_seconds' <<< "$HEALTH")
if [ "$LAG" -gt 300 ]; then
  echo "🔴 SYSTEM LAG: ${LAG}s"
  # Check if orchestrator is running
fi
```

---

### 3. Monitoring Dashboard

Integrate with Grafana, Datadog, or custom dashboard:

```javascript
// Poll health every 30s
setInterval(async () => {
  const health = await fetch('/health', {
    headers: { Authorization: `Bearer ${SERVICE_KEY}` }
  }).then(r => r.json());

  // Update metrics
  metrics.lag.set(health.estimated_lag_seconds);
  metrics.stuck.set(health.stuck_count);
  metrics.dead.set(health.dead_last_24h);
  metrics.queued.set(health.jobs_queued.total);
  metrics.processing.set(health.jobs_processing.count);

  // Alert conditions
  if (health.stuck_count > 0) {
    alert('CRITICAL: Stuck jobs detected');
  }
  if (health.estimated_lag_seconds > 300) {
    alert('WARNING: System lag > 5 minutes');
  }
}, 30000);
```

---

### 4. Pre-Deploy Validation

```bash
# Before deploying new code, check baseline
HEALTH_BEFORE=$(curl "/health" -H "Authorization: Bearer $KEY")

# Deploy...

# Wait 2 minutes for warmup
sleep 120

# Check health after deploy
HEALTH_AFTER=$(curl "/health" -H "Authorization: Bearer $KEY")

# Compare
LAG_BEFORE=$(jq '.estimated_lag_seconds' <<< "$HEALTH_BEFORE")
LAG_AFTER=$(jq '.estimated_lag_seconds' <<< "$HEALTH_AFTER")

if [ "$LAG_AFTER" -gt $((LAG_BEFORE * 2)) ]; then
  echo "🔴 DEPLOY DEGRADED PERFORMANCE"
  # Consider rollback
fi
```

---

### 5. Capacity Planning

```bash
# Collect metrics over time
while true; do
  TIMESTAMP=$(date -Iseconds)
  HEALTH=$(curl "/health" -H "Authorization: Bearer $KEY")

  echo "$TIMESTAMP,$HEALTH" >> health_log.jsonl

  sleep 60
done

# Analyze trends
# - What's the p95 lag during peak hours?
# - How many jobs are queued at peak?
# - What's the average processing time?
```

---

## Performance

### Query Strategy

Optimized for speed:
- Separate queries per metric (no complex JOINs)
- Index usage: `status` column (existing index)
- No aggregations in PostgreSQL (done in TypeScript)
- No nested queries

### Expected Latency

- **Target**: < 200ms
- **Typical**: 50-150ms (< 100 jobs in system)
- **Under load**: 150-300ms (100-500 jobs in system)

### Optimization Path (Future)

If response time degrades:
1. Add materialized view for aggregations
2. Cache results (15-30s TTL acceptable for health metrics)
3. Move to RPC with optimized SQL

---

## Alerts Configuration

### Recommended Alerts

**Critical (PagerDuty/on-call)**:
```yaml
- name: stuck_jobs
  condition: stuck_count > 0
  severity: critical
  message: "Jobs are stuck - orchestrator may be down"

- name: system_lag_critical
  condition: estimated_lag_seconds > 600
  severity: critical
  message: "System lag > 10 minutes - users affected"
```

**Warning (Slack)**:
```yaml
- name: system_lag_warning
  condition: estimated_lag_seconds > 300
  severity: warning
  message: "System lag > 5 minutes - investigate"

- name: high_failure_rate
  condition: dead_last_24h > 10
  severity: warning
  message: "High job failure rate - check dead-jobs endpoint"
```

**Info (Dashboard)**:
```yaml
- name: queue_growing
  condition: jobs_queued.total > 50
  severity: info
  message: "Queue is large - consider scaling"
```

---

## Integration with Dead Jobs Endpoint

Health and dead-jobs are complementary:

**Health endpoint**:
- Aggregated metrics
- Real-time snapshot
- Fast (< 200ms)
- High-level overview

**Dead-jobs endpoint**:
- Detailed failure analysis
- Historical view (configurable time range)
- Reason codes and error messages
- Diagnostic details

**Workflow**:
1. Check `/health` for high-level status
2. If `dead_last_24h > threshold`, call `/dead-jobs` for details
3. Analyze `by_reason` and `by_type` in dead-jobs response
4. Drill into specific failures with `correlation_id` filter

---

## Troubleshooting

### Issue: 401 Unauthorized

**Cause**: Missing or invalid service_role key

**Fix**:
```bash
export SUPABASE_SERVICE_ROLE_KEY="your_key"
curl "/health" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

---

### Issue: High `stuck_count`

**Diagnosis**:
```sql
-- Find stuck jobs
SELECT id, type, locked_at, locked_by, heartbeat_at
FROM executor_jobs
WHERE status = 'running'
  AND locked_at < now() - interval '30 minutes'
ORDER BY locked_at ASC;
```

**Common causes**:
1. Orchestrator not running (no heartbeats)
2. Worker crashed mid-execution
3. External service timeout (TSA, blockchain)

**Fix**:
1. Restart orchestrator
2. Jobs will be reclaimed by TTL mechanism
3. Check external service health

---

### Issue: High `estimated_lag_seconds`

**Diagnosis**:
```sql
-- See oldest queued jobs
SELECT id, type, run_at, created_at
FROM executor_jobs
WHERE status = 'queued'
ORDER BY run_at ASC
LIMIT 10;
```

**Common causes**:
1. Orchestrator batch size too small
2. High job creation rate
3. Orchestrator not polling frequently enough

**Fix**:
1. Increase orchestrator batch size (`p_limit` in claim RPC)
2. Scale orchestrator (run multiple instances)
3. Check cron schedule (should be ≤ 1 min)

---

### Issue: High `dead_last_24h`

**Action**: Use dead-jobs endpoint for details

```bash
curl "/dead-jobs?since_hours=24" | jq '.summary.by_reason'

# Output:
# {
#   "ttl_exceeded": 5,
#   "max_attempts_exceeded": 10
# }
```

**If ttl_exceeded dominates**: TTL too aggressive or workers too slow
**If max_attempts_exceeded dominates**: Systemic failures (check external services)

---

## What This Endpoint Does NOT Do

🚫 **Does not repair** (read-only)
🚫 **Does not retry jobs** (use manual intervention in Fase 4)
🚫 **Does not provide UI** (raw JSON for integration)
🚫 **Does not include canary status** (implemented in Fase 3)
🚫 **Does not include error samples** (can be added later if needed)

This endpoint **observes**, it does not **act**.

---

## Definition of Done ✅

Can answer in < 2 minutes:

- ✅ **How many jobs** are waiting? (`jobs_queued.by_type`)
- ✅ **Is the system** processing? (`jobs_processing.count`)
- ✅ **Are jobs stuck?** (`stuck_count`)
- ✅ **Is the system lagging?** (`estimated_lag_seconds`)
- ✅ **Recent failures?** (`dead_last_24h`)

---

## Next Steps

With health endpoint working:

1. **Fase 2.x**: Fix WORKER_ID race condition (unique instance IDs)
2. **Fase 2.y**: Define trace_id policy (with cutoff timestamp)
3. **Fase 2 DONE**: All happy paths closed
4. **Fase 3**: Canary + Invariants (now safe to implement)

---

## Files

- **Endpoint**: `supabase/functions/health/index.ts`
- **Docs**: `docs/fase2/fase2.1-health-endpoint.md` (this file)

---

## Changelog

- **2026-02-01**: Initial implementation (Fase 2.1)
  - Queue metrics (by_type + total)
  - Processing metrics (count + avg_age)
  - Stuck detection (TTL-based)
  - Dead jobs count (last 24h)
  - System lag (estimated_lag_seconds)
  - Runtime version
