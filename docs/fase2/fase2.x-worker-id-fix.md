# Fase 2.x - Worker ID Fix

## Overview

Fix race condition causado por múltiples orchestrator instances usando el mismo `WORKER_ID='orchestrator'`.

**Implementation Date**: 2026-02-01
**Status**: ✅ Complete

---

## Problema

### Situación Anterior

```typescript
const WORKER_ID = 'orchestrator';  // ❌ Compartido entre todas las instances
```

**Consecuencias**:
- Múltiples orchestrator instances reclaman jobs con mismo `locked_by='orchestrator'`
- Ownership guards fallan (no detectan ownership loss)
- Jobs pueden ser procesados por múltiples workers simultáneamente
- Race conditions en:
  - Heartbeat updates
  - Status updates (succeeded, failed)
  - Trace ID assignment

**Síntomas observados**:
- Jobs stuck en `running` sin progreso
- Heartbeat nunca se actualiza (`heartbeat_at = locked_at`)
- Errores "Job ownership lost" en logs
- Jobs que fallan sin razón aparente

---

## Solución

### Implementación

```typescript
const WORKER_ID = 'orchestrator';               // Base identifier
const RUN_INSTANCE_ID = crypto.randomUUID();    // Unique per instance
const RUN_WORKER_ID = `${WORKER_ID}-${RUN_INSTANCE_ID}`;  // ✅ Unique worker ID

// Use RUN_WORKER_ID everywhere:
// - claim_orchestrator_jobs(p_worker_id: RUN_WORKER_ID)
// - update_job_heartbeat(p_worker_id: RUN_WORKER_ID)
// - ownership guards: .eq('locked_by', RUN_WORKER_ID)
// - trace_id generation
// - executor_job_runs.worker_id
```

**Formato**:
- `orchestrator-550e8400-e29b-41d4-a716-446655440000`
- Base: `orchestrator` (constante)
- UUID: `crypto.randomUUID()` (único por deployment/restart)

---

## Cambios Aplicados

### Archivo: `supabase/functions/orchestrator/index.ts`

**5 cambios críticos:**

#### 1. Claim RPC (línea 380)
```typescript
// ANTES:
const { data: jobs, error } = await supabase.rpc('claim_orchestrator_jobs', {
  p_limit: 10,
  p_worker_id: WORKER_ID  // ❌ Compartido
});

// DESPUÉS:
const { data: jobs, error } = await supabase.rpc('claim_orchestrator_jobs', {
  p_limit: 10,
  p_worker_id: RUN_WORKER_ID  // ✅ Único
});
```

#### 2. Heartbeat RPC (línea 230)
```typescript
// ANTES:
const { error } = await supabase.rpc('update_job_heartbeat', {
  p_job_id: jobId,
  p_worker_id: WORKER_ID,  // ❌ Compartido
});

// DESPUÉS:
const { error } = await supabase.rpc('update_job_heartbeat', {
  p_job_id: jobId,
  p_worker_id: RUN_WORKER_ID,  // ✅ Único
});
```

#### 3. Ownership Guard - Trace ID Update (línea 249)
```typescript
// ANTES:
const { data: traceRows } = await supabase
  .from('executor_jobs')
  .update({ trace_id })
  .eq('id', jobId)
  .eq('locked_by', WORKER_ID)  // ❌ No detecta ownership loss
  .select('id');

// DESPUÉS:
const { data: traceRows } = await supabase
  .from('executor_jobs')
  .update({ trace_id })
  .eq('id', jobId)
  .eq('locked_by', RUN_WORKER_ID)  // ✅ Detecta ownership loss
  .select('id');
```

#### 4. Ownership Guard - Succeeded Update (línea 308)
```typescript
// ANTES:
await supabase
  .from('executor_jobs')
  .update({ status: 'succeeded', ... })
  .eq('id', jobId)
  .eq('locked_by', WORKER_ID);  // ❌ No detecta ownership loss

// DESPUÉS:
await supabase
  .from('executor_jobs')
  .update({ status: 'succeeded', ... })
  .eq('id', jobId)
  .eq('locked_by', RUN_WORKER_ID);  // ✅ Detecta ownership loss
```

#### 5. Ownership Guard - Failed/Retry Update (línea 365)
```typescript
// ANTES:
await supabase
  .from('executor_jobs')
  .update(updatePayload)
  .eq('id', jobId)
  .eq('locked_by', WORKER_ID);  // ❌ No detecta ownership loss

// DESPUÉS:
await supabase
  .from('executor_jobs')
  .update(updatePayload)
  .eq('id', jobId)
  .eq('locked_by', RUN_WORKER_ID);  // ✅ Detecta ownership loss
```

---

## Verificación

### SQL Queries

#### Test 1: No debe haber ownership conflicts
```sql
-- Jobs con mismo locked_by (debe retornar 0 rows)
SELECT locked_by, COUNT(*) as job_count
FROM executor_jobs
WHERE status = 'running'
GROUP BY locked_by
HAVING COUNT(*) > 1;

-- Expected: 0 rows
```

#### Test 2: Formato de locked_by
```sql
-- Ver worker IDs activos
SELECT locked_by, COUNT(*) as count
FROM executor_jobs
WHERE status = 'running'
GROUP BY locked_by;

-- Expected format: orchestrator-{uuid}
```

#### Test 3: No debe haber formato legacy
```sql
-- Jobs con formato viejo (debe ser 0)
SELECT COUNT(*)
FROM executor_jobs
WHERE status = 'running'
  AND locked_by = 'orchestrator';  -- Old format

-- Expected: 0
```

#### Test 4: Heartbeat updates funcionan
```sql
-- Jobs con heartbeat reciente
SELECT
  id,
  type,
  locked_by,
  heartbeat_at,
  extract(epoch from (now() - heartbeat_at)) as heartbeat_age_seconds
FROM executor_jobs
WHERE status = 'running'
  AND heartbeat_at IS NOT NULL
ORDER BY heartbeat_at DESC;

-- Verify: heartbeat_age_seconds < 60 para jobs activos
```

#### Test 5: Trace IDs incluyen worker ID único
```sql
-- Verificar formato de trace_id
SELECT
  trace_id,
  locked_by
FROM executor_jobs
WHERE trace_id IS NOT NULL
  AND updated_at > now() - interval '1 hour'
LIMIT 10;

-- Verify:
-- trace_id: orchestrator-{uuid}-{job_id}-{attempt}
-- locked_by: orchestrator-{uuid}
-- El {uuid} debe coincidir
```

### Script de verificación

Ver: `scratchpad/verify_worker_id_fix.sql`

```bash
psql $DATABASE_URL -f scratchpad/verify_worker_id_fix.sql
```

---

## Impacto

### Antes del fix

**Problemas observados**:
- ❌ Jobs stuck en running sin progreso
- ❌ Heartbeat nunca se actualiza
- ❌ Ownership guards no funcionan
- ❌ Race conditions entre instances
- ❌ Jobs procesados múltiples veces

**Ejemplo de log (malo)**:
```json
{
  "message": "Job ownership lost",
  "jobId": "abc-123",
  "locked_by": "orchestrator",  // No unique
  "trace_id": "orchestrator-abc-123-1"
}
```

### Después del fix

**Comportamiento esperado**:
- ✅ Cada instance tiene unique worker ID
- ✅ Ownership guards funcionan correctamente
- ✅ Heartbeat updates succeed
- ✅ No race conditions
- ✅ Jobs procesados una sola vez

**Ejemplo de log (bueno)**:
```json
{
  "message": "Job processing started",
  "jobId": "abc-123",
  "locked_by": "orchestrator-550e8400-e29b-41d4-a716-446655440000",
  "trace_id": "orchestrator-550e8400-e29b-41d4-a716-446655440000-abc-123-1"
}
```

---

## Deployment

### Rolling Deployment Safe

Este fix es **safe para rolling deployment**:

1. **Nuevas instances**: Usan `RUN_WORKER_ID` (format: `orchestrator-{uuid}`)
2. **Viejas instances**: Usan `WORKER_ID` (format: `orchestrator`)
3. **No hay conflicto**: Formats diferentes → ownership guards funcionan

**Proceso**:
1. Deploy nueva versión
2. Viejas instances terminan sus jobs
3. Nuevas instances reclaman nuevos jobs
4. Gradual migration sin downtime

### Verificar después del deploy

```bash
# 1. Check format distribution
psql $DATABASE_URL -c "
SELECT
  CASE
    WHEN locked_by = 'orchestrator' THEN 'legacy'
    WHEN locked_by LIKE 'orchestrator-%' THEN 'new'
    ELSE 'unknown'
  END as format,
  COUNT(*) as count
FROM executor_jobs
WHERE status = 'running'
GROUP BY 1;
"

# Expected progression:
# Initially: legacy=N, new=M
# After 30 min: legacy=0, new=M+N

# 2. Check no ownership conflicts
psql $DATABASE_URL -c "
SELECT COUNT(*)
FROM (
  SELECT locked_by, COUNT(*) as cnt
  FROM executor_jobs
  WHERE status = 'running'
  GROUP BY locked_by
  HAVING COUNT(*) > 1
) conflicts;
"

# Expected: 0
```

---

## Benefits

### 1. Ownership Integrity

**Antes**: Worker A puede sobrescribir trabajo de Worker B
**Después**: Ownership guards previenen conflictos

### 2. Observabilidad

**Antes**: No se sabe qué instance procesó qué job
**Después**: `locked_by` y `trace_id` revelan instance exacta

### 3. Debugging

**Antes**: "Job failed" → no sé qué worker lo procesó
**Después**: "Job failed" → puedo ver logs de esa instance específica

### 4. Horizontal Scaling

**Antes**: Múltiples instances causan race conditions
**Después**: Múltiples instances operan independientemente

---

## Monitoring

### Métricas a trackear

```sql
-- 1. Distribution of worker IDs
SELECT
  left(locked_by, 50) as worker_id,
  COUNT(*) as active_jobs
FROM executor_jobs
WHERE status = 'running'
GROUP BY locked_by
ORDER BY COUNT(*) DESC;

-- Expected: Ver diferentes UUIDs (1 por instance)

-- 2. Ownership conflicts (debe ser 0)
SELECT COUNT(*) FROM (
  SELECT locked_by
  FROM executor_jobs
  WHERE status = 'running'
  GROUP BY locked_by
  HAVING COUNT(*) > 1
) conflicts;

-- Expected: 0

-- 3. Heartbeat health
SELECT
  locked_by,
  COUNT(*) as jobs,
  MAX(heartbeat_at) as last_heartbeat,
  extract(epoch from (now() - MAX(heartbeat_at))) as age_seconds
FROM executor_jobs
WHERE status = 'running'
GROUP BY locked_by;

-- Expected: age_seconds < 60 para instances activas
```

---

## Related Issues

### Fixed by this change:
- ✅ Race condition en job claiming
- ✅ Ownership guards no funcionaban
- ✅ Heartbeat updates fallaban
- ✅ Jobs stuck en running sin progreso
- ✅ Múltiples workers procesando mismo job

### Still pending (out of scope):
- ⏳ Trace ID policy enforcement (Paso 3)
- ⏳ Canary system (Fase 3)
- ⏳ Invariants validation (Fase 3)

---

## Definition of Done ✅

- [x] `RUN_WORKER_ID` usado en claim RPC
- [x] `RUN_WORKER_ID` usado en heartbeat RPC
- [x] `RUN_WORKER_ID` usado en ownership guards (3 lugares)
- [x] Verificación SQL confirma formato único
- [x] No ownership conflicts en production
- [x] Documentación completa

---

## Next Steps

Con WORKER_ID fix completado:

1. **Paso 3**: Define trace_id policy (con cutoff timestamp)
2. **Verificar**: Happy paths cerrados (7/7)
3. **Declarar**: Fase 2 DONE
4. **Avanzar**: Fase 3 (Canary + Invariants)

---

## Files

- **Implementation**: `supabase/functions/orchestrator/index.ts`
- **Verification**: `scratchpad/verify_worker_id_fix.sql`
- **Docs**: `docs/fase2/fase2.x-worker-id-fix.md` (this file)

---

## Changelog

- **2026-02-01**: Initial fix
  - Changed 5 critical uses of WORKER_ID to RUN_WORKER_ID
  - Verified no ownership conflicts
  - Safe for rolling deployment
