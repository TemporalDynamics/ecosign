# 🛡️ Anchoring System Hardening - PR Summary

> **DEV 4 — Forense / Infra & Blockchain**  
> **Fecha:** 2025-12-13  
> **Estado:** Ready for Review

---

## 📋 Resumen

Este PR implementa mejoras críticas de robustez, observabilidad y confiabilidad en el sistema de anchoring (Bitcoin y Polygon). Se solucionan 6 bugs críticos detectados durante la auditoría forense.

---

## 🐛 Bugs Solucionados

### P0-1: Validación robusta de documentHash en anchor-polygon ✅
**Archivo:** `supabase/functions/anchor-polygon/index.ts`

**Problema:** La validación solo revisaba formato, no existencia. Podía insertar con `documentHash` undefined.

**Solución:**
```typescript
// ANTES
if (!documentHash || !/^[a-f0-9]{64}$/i.test(documentHash)) {
  return error
}

// DESPUÉS
if (!documentHash || typeof documentHash !== 'string') {
  return jsonResponse({ error: 'documentHash is required and must be a string' }, 400)
}

const isHex64 = /^[0-9a-f]{64}$/i
if (!isHex64.test(documentHash.trim())) {
  return jsonResponse({ error: 'Invalid documentHash. Must be 64 hex characters (SHA-256)' }, 400)
}
```

**Impacto:** Previene corrupción de datos y estados inconsistentes.

---

### P0-2: Update de user_documents al encolar Polygon anchor ✅
**Archivo:** `supabase/functions/anchor-polygon/index.ts`

**Problema:** Bitcoin actualiza `user_documents.overall_status = 'pending_anchor'` al encolar, pero Polygon no lo hacía. Estado inconsistente entre ambos flujos.

**Solución:**
```typescript
// Después de INSERT en anchors
if (userDocumentId) {
  const { error: updateError } = await supabase
    .from('user_documents')
    .update({
      overall_status: 'pending_anchor',
      polygon_anchor_id: anchorData.id,
    })
    .eq('id', userDocumentId)

  if (updateError) {
    console.warn('Failed to update user_documents:', updateError)
    // Don't fail the request, anchor is already queued
  }
}
```

**Impacto:** Consistencia entre flujos Bitcoin/Polygon. UI refleja estado correcto inmediatamente.

---

### P0-3: Transacción atómica para Polygon confirmations ✅
**Archivos:**
- `supabase/migrations/20251213000000_polygon_atomic_tx.sql` (nueva función)
- `supabase/functions/process-polygon-anchors/index.ts` (usa la función)

**Problema:** `process-polygon-anchors` hacía 2 UPDATEs separados:
1. UPDATE anchors
2. UPDATE user_documents

Si el 2do falla, `anchors` está confirmado pero `user_documents` no → estado inconsistente.

**Solución:** Nueva función `anchor_polygon_atomic_tx()` que:
- Usa `pg_advisory_xact_lock()` para evitar race conditions
- Actualiza `anchors` + `user_documents` + `audit_logs` en una sola transacción
- Rollback automático si cualquier paso falla

```sql
CREATE OR REPLACE FUNCTION public.anchor_polygon_atomic_tx(
  _anchor_id UUID,
  _anchor_user_id UUID,
  _tx_hash TEXT,
  _block_number BIGINT,
  _block_hash TEXT,
  _confirmed_at TIMESTAMPTZ,
  _metadata JSONB DEFAULT NULL,
  _user_document_updates JSONB DEFAULT NULL,
  _polygon_attempts INTEGER DEFAULT NULL
) RETURNS VOID
```

**Impacto:** Elimina race conditions. Estado siempre consistente. Auditoría completa.

---

### P1-1: Exponential backoff en retries de Polygon ✅
**Archivos:**
- `supabase/functions/_shared/retry.ts` (nueva utilidad)
- `supabase/functions/process-polygon-anchors/index.ts` (usa backoff)

**Problema:** Polygon reintentaba cada 1 minuto sin pausa. Puede saturar RPC provider si TX está stuck.

**Solución:** Estrategia de exponential backoff:
```
Intento 1: 1 min
Intento 2: 2 min
Intento 3: 4 min
Intento 4: 8 min
Intento 5+: 10 min (max)
```

```typescript
// Código
if (!shouldRetry(anchor.updated_at, attempts, RETRY_CONFIGS.polygon)) {
  const { nextRetryAt, waitTimeMs } = getNextRetryTime(...)
  logger.debug('anchor_backoff_skip', { anchorId, nextRetryAt, waitTimeMs })
  skippedBackoff++
  continue
}
```

**Impacto:** Reduce carga en RPC. Más respetuoso con rate limits. Evita ban.

---

### P1-2: Logging estructurado con contexto ✅
**Archivos:**
- `supabase/functions/_shared/logger.ts` (nueva utilidad)
- `supabase/functions/process-polygon-anchors/index.ts` (usa logger)
- `supabase/functions/process-bitcoin-anchors/index.ts` (usa logger)

**Problema:** Mix de `console.log`, `console.warn`, `console.error` sin contexto estructurado. Dificulta debugging y agregación de logs.

**Solución:** Logger centralizado con formato JSON:
```typescript
logger.info('anchor_confirmed', {
  anchorId: anchor.id,
  txHash,
  blockNumber: receipt.blockNumber,
  confirmedAt,
  attempts,
  documentId: anchor.user_document_id
})

// Output:
{
  "timestamp": "2025-12-13T23:42:00.000Z",
  "level": "INFO",
  "message": "anchor_confirmed",
  "context": {
    "service": "process-polygon-anchors",
    "anchorId": "...",
    "txHash": "0x...",
    "blockNumber": 12345,
    "confirmedAt": "...",
    "attempts": 3,
    "documentId": "..."
  }
}
```

**Impacto:** Logs parseables por agregadores (Datadog, CloudWatch, etc). Debugging eficiente.

---

### P1-3: Health checks de infraestructura ✅
**Archivo:** `supabase/functions/anchoring-health-check/index.ts` (nueva función)

**Problema:** No había manera de monitorear salud de calendars, RPC providers, database.

**Solución:** Edge function que verifica:
- ✅ Database connectivity (query test)
- ✅ Polygon RPC (block sync check)
- ✅ Bitcoin calendars (3 servers)
- ✅ Mempool API (tip height)

```typescript
// Response ejemplo
{
  "overall": "healthy",
  "timestamp": "2025-12-13T23:42:00.000Z",
  "checks": {
    "database": { "status": "healthy", "latencyMs": 45 },
    "polygonRpc": { "status": "healthy", "latencyMs": 120, "details": { "blockNumber": 12345 } },
    "bitcoinCalendars": { "status": "degraded", "details": { "healthyCount": 2, "totalCount": 3 } },
    "mempoolApi": { "status": "healthy", "latencyMs": 230 }
  }
}
```

**Uso:**
```bash
# Manual
curl https://your-project.supabase.co/functions/v1/anchoring-health-check

# Automated monitoring (cron cada 5 min)
SELECT cron.schedule('anchoring-health-check', '*/5 * * * *', $$
  SELECT net.http_post(url := 'https://your-project.supabase.co/functions/v1/anchoring-health-check', ...)
$$);
```

**Impacto:** Monitoreo proactivo. Detecta degradaciones antes de que fallen anchors.

---

## 📊 Métricas Agregadas

### Antes (sin fixes)
- ❌ Validación débil → potencial data corruption
- ❌ Split updates → race conditions posibles
- ❌ Retry constante → puede saturar RPC
- ❌ Logs no estructurados → debugging manual
- ❌ Sin health checks → reactive firefighting

### Después (con fixes)
- ✅ Validación robusta → cero corruption
- ✅ Transacciones atómicas → cero race conditions
- ✅ Exponential backoff → RPC-friendly
- ✅ Logs JSON → agregación automática
- ✅ Health checks → monitoring proactivo

---

## 🧪 Testing

### Tests Recomendados

#### 1. Validación de documentHash
```bash
# Test undefined hash (debe fallar con 400)
curl -X POST https://your-project.supabase.co/functions/v1/anchor-polygon \
  -H "Content-Type: application/json" \
  -d '{"documentHash": null}'

# Test invalid format (debe fallar con 400)
curl -X POST https://your-project.supabase.co/functions/v1/anchor-polygon \
  -H "Content-Type: application/json" \
  -d '{"documentHash": "not-a-hash"}'
```

#### 2. Transacción atómica
```sql
-- Simular falla en medio de tx (debe rollback todo)
BEGIN;
SELECT anchor_polygon_atomic_tx(...);
ROLLBACK;

-- Verificar que nada se guardó
SELECT * FROM anchors WHERE id = 'test-anchor-id'; -- debe estar vacío
SELECT * FROM user_documents WHERE id = 'test-doc-id'; -- sin cambios
SELECT * FROM audit_logs WHERE metadata->>'anchor_id' = 'test-anchor-id'; -- vacío
```

#### 3. Exponential backoff
```typescript
// Mock anchor con updated_at reciente
const anchor = {
  id: 'test-id',
  updated_at: new Date().toISOString(),
  polygon_attempts: 3
}

// shouldRetry debe retornar false (muy pronto para reintentar)
const shouldRetry = shouldRetry(anchor.updated_at, anchor.polygon_attempts, RETRY_CONFIGS.polygon)
assert(shouldRetry === false)
```

#### 4. Health check
```bash
# Verificar response format
curl https://your-project.supabase.co/functions/v1/anchoring-health-check | jq

# Verificar que retorna 200 si healthy, 503 si unhealthy
```

---

## 📦 Archivos Modificados

### Nuevos Archivos
```
supabase/functions/_shared/logger.ts
supabase/functions/_shared/retry.ts
supabase/functions/anchoring-health-check/index.ts
supabase/migrations/20251213000000_polygon_atomic_tx.sql
docs/ANCHORING_FLOW.md
docs/ANCHORING_HARDENING_PR.md
```

### Archivos Modificados
```
supabase/functions/anchor-polygon/index.ts
supabase/functions/process-polygon-anchors/index.ts
supabase/functions/process-bitcoin-anchors/index.ts
```

---

## 🚀 Deployment Plan

### Fase 1: Database Migration (sin downtime)
```bash
# Aplicar función atómica de Polygon
psql -f supabase/migrations/20251213000000_polygon_atomic_tx.sql
```

### Fase 2: Deploy Edge Functions (canary)
```bash
# Deploy solo en staging primero
supabase functions deploy anchor-polygon --project-ref staging
supabase functions deploy process-polygon-anchors --project-ref staging
supabase functions deploy process-bitcoin-anchors --project-ref staging
supabase functions deploy anchoring-health-check --project-ref staging

# Monitor por 24h
curl https://staging.supabase.co/functions/v1/anchoring-health-check

# Si todo OK, deploy a prod
supabase functions deploy anchor-polygon --project-ref prod
supabase functions deploy process-polygon-anchors --project-ref prod
supabase functions deploy process-bitcoin-anchors --project-ref prod
supabase functions deploy anchoring-health-check --project-ref prod
```

### Fase 3: Configurar Cron de Health Check
```sql
-- En Dashboard SQL Editor
SELECT cron.schedule(
  'anchoring-health-check',
  '*/5 * * * *', -- cada 5 minutos
  $$
    SELECT net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/anchoring-health-check',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    );
  $$
);
```

### Fase 4: Monitorear Logs
```bash
# Ver logs estructurados
supabase functions logs process-polygon-anchors --project-ref prod | jq

# Filtrar solo errores
supabase functions logs process-polygon-anchors --project-ref prod | jq 'select(.level == "ERROR")'

# Ver métricas de duración
supabase functions logs process-polygon-anchors --project-ref prod | jq 'select(.message == "anchor_confirmed") | .context.attempts'
```

---

## 📈 Observabilidad

### Logs Clave a Monitorear

#### Success Metrics
```json
// Anchor confirmado
{
  "level": "INFO",
  "message": "anchor_confirmed",
  "context": {
    "anchorId": "...",
    "attempts": 3,
    "durationMs": 1234
  }
}
```

#### Error Metrics
```json
// Falla de anchor
{
  "level": "ERROR",
  "message": "anchor_failed",
  "context": {
    "anchorId": "...",
    "attempts": 20,
    "reason": "Max attempts reached"
  },
  "error": {
    "message": "...",
    "stack": "..."
  }
}
```

#### Performance Metrics
```json
// Duración de procesamiento
{
  "level": "INFO",
  "message": "process_polygon_anchors_completed",
  "context": {
    "processed": 25,
    "confirmed": 20,
    "failed": 2,
    "waiting": 3,
    "durationMs": 5432
  }
}
```

### Alertas Recomendadas

```yaml
# AlertManager config (ejemplo)
alerts:
  - name: anchor_high_failure_rate
    condition: |
      (count(anchor_failed) / count(anchor_submitted)) > 0.1
    duration: 15m
    action: notify_slack

  - name: polygon_rpc_degraded
    condition: |
      health_check.polygonRpc.status == "unhealthy"
    duration: 5m
    action: page_oncall

  - name: bitcoin_calendar_all_down
    condition: |
      health_check.bitcoinCalendars.healthyCount == 0
    duration: 10m
    action: page_oncall
```

---

## 🎯 Próximos Pasos (P2)

Estas mejoras son opcionales pero recomendadas para futuras iteraciones:

### 1. Métricas Detalladas
Crear tabla `anchor_metrics`:
```sql
CREATE TABLE anchor_metrics (
  id uuid PRIMARY KEY,
  anchor_id uuid REFERENCES anchors(id),
  metric_type text, -- 'submission', 'confirmation', 'failure'
  duration_ms integer,
  attempts integer,
  metadata jsonb,
  created_at timestamp DEFAULT now()
);
```

### 2. Dashboard de Anchoring
- Grafana/Datadog dashboard con:
  - Tasa de éxito/falla por tipo
  - Duración promedio de confirmación
  - Health status de infraestructura
  - Gas cost tracking (Polygon)

### 3. Circuit Breaker Avanzado
- Pausar procesamiento si RPC provider está caído
- Automatic failover a RPC secundario
- Rate limiting inteligente

### 4. Dead Letter Queue
- Mover anchors "stuck" a tabla separada
- Manual review/retry por ops

---

## ✅ Checklist Pre-Merge

- [x] Bugs P0 solucionados (validación, atomic tx, user_documents update)
- [x] Bugs P1 solucionados (backoff, logging, health checks)
- [x] Documentación forense completa (ANCHORING_FLOW.md)
- [x] PR summary (este documento)
- [ ] Tests manuales pasados
- [ ] Migration probada en staging
- [ ] Health check endpoint funcionando
- [ ] Logs estructurados verificados
- [ ] Team review completado
- [ ] Deploy plan aprobado

---

## 🙏 Créditos

**Auditoría y Hardening:** DEV 4 — Forense / Infra & Blockchain  
**Revisión:** [Pendiente]  
**Aprobación:** [Pendiente]

**Filosofía:** "Nada silencioso, nada mágico. Menos magia, más verdad."

---

*Última actualización: 2025-12-13 23:42 UTC*
