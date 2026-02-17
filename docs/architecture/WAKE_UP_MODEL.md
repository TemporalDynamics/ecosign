# Wake-Up Model - Anchor Workers

## Overview

Anchor confirmation workers use **pg_cron** for periodic polling. This document explains the architecture and observability.

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   pg_cron      │────▶│ process-polygon-anchors│────▶│   anchors      │
│  (every 5 min) │     │ process-bitcoin-anchors│     │   (table)      │
└─────────────────┘     └──────────┬───────────┘     └────────┬────────┘
                                  │
                                  ▼
                         ┌──────────────────────┐
                         │ document_entities    │
                         │ events[]            │
                         │ (source of truth)   │
                         └──────────────────────┘
```

## Workers

| Worker | Schedule | Responsibility |
|--------|----------|----------------|
| `process-polygon-anchors` | Every 5 min | Poll Polygon RPC, confirm transactions, emit `anchor.confirmed` |
| `process-bitcoin-anchors` | Every 5 min | Poll OpenTimestamps, verify Bitcoin timestamps, emit `anchor.confirmed` |

## Rules

1. **Workers ONLY:**
   - Read from `anchors` table
   - Update `anchors` table (status, tx info)
   - Emit events to `document_entities.events[]`

2. **Workers NEVER:**
   - Update `user_documents` (derived table)
   - Modify `protection_level`
   - Emit events for other workers

3. **Idempotence:**
   - Handled in `appendEvent()` - checks for existing anchor.confirmed before inserting
   - Trigger `validate_anchor_uniqueness()` provides secondary protection

## Observability

### Health Check

```bash
GET /functions/v1/anchor-health
```

Response:
```json
{
  "timestamp": "2026-02-16T...",
  "workers_alive": true,
  "workers": {
    "process-polygon-anchors": { "last_seen_at": "...", "status": "alive" },
    "process-bitcoin-anchors": { "last_seen_at": "...", "status": "alive" }
  },
  "pending": { "polygon": 5, "bitcoin": 12 },
  "recent_confirmations": { "polygon": 3, "bitcoin": 1 },
  "stalled": { "polygon": 0, "bitcoin": 0 },
  "alert": false
}
```

### Heartbeat

Each worker calls `worker_heartbeat()` at the start of each run. This updates `system_workers` table.

- If a worker hasn't run in 5 minutes → status = "stalled"
- If a worker hasn't run in 30 minutes → status = "dead"

### Alert Conditions

Alert triggers when:
- `workers_alive: false` (no heartbeat in 5 min)
- `stalled.polygon > 10` (10+ anchors stuck in pending for 1+ hour)
- `stalled.bitcoin > 10`

## Cron Setup

Workers are scheduled via pg_cron in Supabase:

```sql
SELECT cron.schedule('process-polygon-anchors', '*/5 * * * *', 
  $$SELECT net.http_post(...)$$);
```

To check active crons:
```sql
SELECT jobname, schedule, active FROM cron.job;
```

## Why Cron?

For a team of 1, Cron is the right choice because:

1. **Simple** - No job queue complexity
2. **Reliable** - Supabase manages pg_cron
3. **Observable** - Heartbeat provides real-time status
4. **Sufficient** - 5-minute polling is adequate for blockchain confirmations

Alternative (not implemented): Job-based polling via executor_jobs would add complexity without significant benefit for this use case.

---

## One-Line Description

> "pg_cron despierta los workers. Los workers confirman anchors y emiten eventos. El estado del producto se deriva exclusivamente de events[]."
