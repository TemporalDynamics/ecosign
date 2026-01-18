# 🔗 Anchoring Flow - Forensic Documentation

> **Estado:** Auditoría completa — Día 1-5  
> **Autor:** DEV 4 — Forense / Infra & Blockchain  
> **Fecha:** 2025-12-13

> Nota Fase 1:
> Este documento describe arquitectura histórica o conceptual.
> No define autoridad operativa ni eventos canónicos en Fase 1.
> La autoridad de ejecución reside exclusivamente en el Executor.

---

## 📊 Executive Summary

### Sistemas Auditados
- ✅ **Bitcoin Anchoring** (OpenTimestamps)
- ✅ **Polygon Anchoring** (Smart Contract)
- ✅ **Cron Jobs** (process-bitcoin-anchors, process-polygon-anchors)
- ✅ **State Management** (anchors, user_documents)

### Bugs Críticos Encontrados
1. ⚠️ **anchor-polygon** puede insertar con `document_hash` undefined
2. ⚠️ Estados calculados inconsistentes entre tablas `anchors` y `user_documents`
3. ⚠️ Retries limitados sin estrategia de backoff exponencial
4. ⚠️ Falta logging estructurado con niveles (INFO, WARN, ERROR)
5. ⚠️ No hay métricas de observabilidad (duraciones, tasas de éxito)

---

## 🎯 Flujo Bitcoin (OpenTimestamps)

### Trigger
```typescript
// Cliente llama:
supabase.functions.invoke('anchor-bitcoin', {
  documentHash: string (64 hex chars),
  documentId?: string,
  userDocumentId?: string,
  userId?: string,
  userEmail?: string
})
```

### Estados Posibles
```
queued → pending → processing → confirmed ✅
                              ↘ failed ❌ (después de 288 intentos = 24h)
```

### Flujo de Procesamiento

#### 1. **Fase: Queueing** (`anchor-bitcoin/index.ts`)
```
INPUT: { documentHash, documentId, userDocumentId, userId, userEmail }
↓
VALIDACIÓN:
  - documentHash existe?
  - Es hex64 válido?
  - userId es UUID válido?
↓
SI userDocumentId && (!documentId || !userEmail):
  FETCH de user_documents para completar datos
↓
INSERT en anchors:
  - anchor_status: 'queued'
  - anchor_type: 'opentimestamps'
↓
UPDATE user_documents:
  - overall_status: 'pending_anchor'
  - bitcoin_status: 'pending'
  - download_enabled: false
↓
RETURN: { anchorId, status: 'queued', estimatedTime: '4-24 hours' }
```

#### 2. **Fase: Submission** (`process-bitcoin-anchors/index.ts` - Cron cada 5min)
```
FETCH anchors WHERE anchor_status = 'queued'
↓
PARA CADA anchor:
  submitToOpenTimestamps(hash) con calendars:
    - https://a.pool.opentimestamps.org
    - https://b.pool.opentimestamps.org
    - https://finney.calendar.eternitywall.com
  ↓
  SI success:
    UPDATE anchor_status: 'pending'
    GUARDAR ots_proof (base64)
    GUARDAR ots_calendar_url
  ↓
  SI failed:
    UPDATE anchor_status: 'failed'
    GUARDAR error_message
```

#### 3. **Fase: Verification** (`process-bitcoin-anchors/index.ts` - Loop cada 5min)
```
FETCH anchors WHERE anchor_status IN ('pending', 'processing')
↓
PARA CADA anchor:
  bitcoin_attempts++
  ↓
  SI attempts > 288 (24 horas):
    ❌ MARCAR como failed
    ↓
    SI tiene Polygon confirmado:
      ✅ user_documents.overall_status = 'certified'
      ✅ download_enabled = true
    SINO:
      ❌ user_documents.overall_status = 'failed'
      ❌ download_enabled = false
    ↓
    SKIP resto
  ↓
  verifyOpenTimestamps(ots_proof, calendar_url)
  ↓
  SI confirmed:
    extractBitcoinTxFromOts() → txid, blockHeight
    fetchBitcoinBlockData(txid) → confirmedAt
    ↓
    ATOMIC TRANSACTION (anchor_atomic_tx):
      - UPDATE anchors: status='confirmed', bitcoin_tx_id, block, timestamps
      - UPDATE user_documents: bitcoin_status='confirmed', overall_status='certified', download_enabled=true
      - INSERT audit_logs
    ↓
    ENVIAR notificación email
    INSERT workflow_notifications
  ↓
  SI NOT confirmed:
    UPDATE anchor_status: 'processing'
    INCREMENTAR bitcoin_attempts
```

### Qué Pasa Si Falla

| Escenario | Consecuencia | Mitigación Actual |
|-----------|--------------|-------------------|
| **Calendar servers caídos** | Falla submission | Intenta 3 calendars diferentes |
| **Bitcoin congestionado** | Demora confirmación | Espera hasta 288 intentos (24h) |
| **Timeout 24h** | `failed` status | Si Polygon OK → certificado válido |
| **Error de red en cron** | Retry en siguiente ejecución | Cron cada 5 min |
| **Falta email** | No notifica | Warning en logs, documento sigue válido |

---

## 🎯 Flujo Polygon (Smart Contract)

### Trigger
```typescript
// Cliente llama:
supabase.functions.invoke('anchor-polygon', {
  documentHash: string (64 hex chars),
  documentId?: string,
  userDocumentId?: string,
  userId?: string,
  userEmail?: string
})
```

### Estados Posibles
```
pending → processing → confirmed ✅
                     ↘ failed ❌ (después de 20 intentos)
```

### Flujo de Procesamiento

#### 1. **Fase: Submission** (`anchor-polygon/index.ts`)
```
INPUT: { documentHash, documentId, userDocumentId, userId, userEmail }
↓
VALIDACIÓN:
  - documentHash es hex64?
↓
LOAD CONFIG:
  - POLYGON_RPC_URL
  - POLYGON_PRIVATE_KEY
  - POLYGON_CONTRACT_ADDRESS
↓
CONNECT a Polygon:
  - Crear provider (JsonRpcProvider)
  - Crear wallet (sponsorWallet)
  - Check balance > 0
↓
SEND TRANSACTION:
  contract.anchorDocument(hashBytes32)
  ↓
  RETURN tx.hash (NO ESPERA confirmación)
↓
SI userDocumentId && (!documentId || !userEmail):
  FETCH de user_documents para completar datos
↓
INSERT en anchors:
  - anchor_type: 'polygon'
  - anchor_status: 'pending'
  - polygon_status: 'pending'
  - polygon_tx_hash: txHash
↓
RETURN: {
  status: 'pending',
  txHash,
  message: 'Transaction submitted. Confirmation in ~30-60s',
  explorerUrl: 'https://polygonscan.com/tx/{txHash}'
}
```

**🐛 BUG DETECTADO:** No hace UPDATE de `user_documents` en esta fase (inconsistente con Bitcoin)

#### 2. **Fase: Confirmation** (`process-polygon-anchors/index.ts` - Cron cada 1min)
```
FETCH anchors WHERE:
  anchor_type = 'polygon' AND
  (polygon_status IN ('pending', 'processing') OR
   anchor_status IN ('pending', 'processing'))
↓
PARA CADA anchor:
  polygon_attempts++
  ↓
  SI !polygon_tx_hash:
    ❌ MARCAR failed: 'Missing polygon_tx_hash'
    SKIP
  ↓
  SI attempts > 20:
    ❌ MARCAR failed: 'Max attempts reached'
    SKIP
  ↓
  receipt = provider.getTransactionReceipt(txHash)
  ↓
  SI !receipt:
    ⏳ UPDATE polygon_status: 'processing'
    CONTINUE (sigue esperando)
  ↓
  SI receipt.status !== 1:
    ❌ MARCAR failed: 'Receipt status {status}'
    SKIP
  ↓
  ✅ CONFIRMADO:
    UPDATE anchors:
      - anchor_status: 'confirmed'
      - polygon_status: 'confirmed'
      - polygon_tx_hash, polygon_block_number, polygon_block_hash
      - polygon_confirmed_at, confirmed_at
    ↓
    UPDATE user_documents:
      - has_polygon_anchor: true
      - overall_status: 'certified'
      - download_enabled: true
    ↓
    INSERT workflow_notifications
```

### Qué Pasa Si Falla

| Escenario | Consecuencia | Mitigación Actual |
|-----------|--------------|-------------------|
| **RPC provider caído** | Error en submission | Return 503, cliente debe reintentar |
| **Sponsor sin POL** | Error en submission | Return 503 con wallet address |
| **TX revertida** | `failed` después de 1 min | Marca failed, no reintenta |
| **TX dropped (mempool)** | Espera hasta 20 intentos | Luego marca failed |
| **Error de red en cron** | Retry en siguiente ejecución | Cron cada 1 min (más rápido que Bitcoin) |

---

## 🔄 Estrategia de Retries

### Bitcoin (OpenTimestamps)
- **Frecuencia:** Cada 5 minutos
- **Max intentos:** 288 (= 24 horas)
- **Threshold de alerta:** 240 intentos (= 20 horas)
- **Comportamiento:** 
  - Intenta verificar proof upgrade
  - Si falla, sigue intentando hasta MAX_ATTEMPTS
  - Al timeout, aplica Política 1 (Polygon fallback)

### Polygon (Smart Contract)
- **Frecuencia:** Cada 1 minuto
- **Max intentos:** 20 (= 20 minutos)
- **Comportamiento:**
  - Consulta receipt en blockchain
  - Si no existe, espera (pending → processing)
  - Si existe con status=1, confirma
  - Si existe con status≠1, marca failed

### Mejoras Recomendadas
```typescript
// TODO: Implementar exponential backoff
const delay = Math.min(baseDelay * (2 ** attempts), maxDelay)

// TODO: Implementar circuit breaker
if (consecutiveFailures > threshold) {
  pauseProcessing(cooldownPeriod)
}

// TODO: Dead letter queue para anchors stuck
if (isStuck(anchor)) {
  moveToDeadLetterQueue(anchor)
  alertOps(anchor)
}
```

---

## 📋 Estado de las Tablas

### `anchors` (tabla principal)

#### Campos Críticos
```sql
anchor_status: 'queued' | 'pending' | 'processing' | 'confirmed' | 'failed'
anchor_type: 'opentimestamps' | 'polygon'

-- Bitcoin específico
ots_proof: bytea (base64 encoded)
ots_calendar_url: text
bitcoin_tx_id: text
bitcoin_attempts: integer
bitcoin_error_message: text

-- Polygon específico
polygon_status: 'pending' | 'processing' | 'confirmed' | 'failed'
polygon_tx_hash: text
polygon_block_number: bigint
polygon_block_hash: text
polygon_confirmed_at: timestamp
polygon_attempts: integer
polygon_error_message: text

-- Notificaciones
notification_sent: boolean
notification_sent_at: timestamp
```

#### Índices
```sql
idx_anchors_status (anchor_status)
idx_anchors_pending (anchor_status) WHERE status IN ('queued', 'pending', 'processing')
idx_anchors_polygon_status (polygon_status)
```

### `user_documents` (estado del documento)

#### Campos Críticos
```sql
overall_status: 'pending' | 'pending_anchor' | 'certified' | 'failed'
download_enabled: boolean

-- Bitcoin tracking
bitcoin_status: 'pending' | 'confirmed' | 'failed'
bitcoin_anchor_id: uuid
bitcoin_confirmed_at: timestamp

-- Polygon tracking
has_polygon_anchor: boolean
polygon_anchor_id: uuid
```

### Política de Estados (Implementada)

```
Política 1: Polygon es suficiente para certificar
├─ Si Polygon = confirmed → overall_status = 'certified', download_enabled = true
└─ Bitcoin es best-effort (no bloquea descarga)

Política 2: Si Bitcoin falla pero Polygon OK
├─ Bitcoin timeout (24h) → bitcoin_status = 'failed'
└─ Pero overall_status = 'certified' (gracias a Polygon)

Política 3: Si ambos fallan
└─ overall_status = 'failed', download_enabled = false
```

---

## 🚨 Bugs Silenciosos Detectados

### 1. ⚠️ **anchor-polygon no valida hash undefined**
**Ubicación:** `supabase/functions/anchor-polygon/index.ts:35`
```typescript
// ❌ ACTUAL: Solo valida formato, no existencia
if (!documentHash || !/^[a-f0-9]{64}$/i.test(documentHash)) {
  return error
}

// ✅ DEBERÍA: Validar como anchor-bitcoin
if (!documentHash || typeof documentHash !== 'string') {
  return jsonResponse({ error: 'documentHash is required' }, 400)
}
const isHex64 = /^[0-9a-f]{64}$/i
if (!isHex64.test(documentHash.trim())) {
  return jsonResponse({ error: 'Invalid documentHash. Must be 64 hex characters (SHA-256).' }, 400)
}
```

### 2. ⚠️ **anchor-polygon no actualiza user_documents al encolar**
**Ubicación:** `supabase/functions/anchor-polygon/index.ts:130`
```typescript
// ❌ FALTA: Update de user_documents después de INSERT en anchors
// Bitcoin lo hace en línea 141-156 de anchor-bitcoin/index.ts
// Polygon no actualiza nada → estado inconsistente

// ✅ AGREGAR:
if (userDocumentId) {
  await supabase
    .from('user_documents')
    .update({
      overall_status: 'pending_anchor',
      // Note: No hay polygon_status en user_documents (solo has_polygon_anchor)
    })
    .eq('id', userDocumentId)
}
```

### 3. ⚠️ **Estados calculados sin validación atómica**
**Problema:** `process-polygon-anchors` hace 2 UPDATEs separados:
```typescript
// Línea 166-180: UPDATE anchors
await supabase.from('anchors').update({ ... })

// Línea 183-195: UPDATE user_documents (separado)
await supabase.from('user_documents').update({ ... })
```

**Riesgo:** Si falla el 2do UPDATE, `anchors` está confirmed pero `user_documents` no.

**Solución:** Usar transacción atómica como Bitcoin (`anchor_atomic_tx` RPC function).

### 4. ⚠️ **Polygon retry sin backoff**
**Problema:** Intenta cada 1 minuto durante 20 minutos → puede saturar RPC si TX está stuck.

**Solución:** Implementar exponential backoff:
```typescript
// Ejemplo:
const backoffDelay = Math.min(60 * (2 ** (attempts - 1)), 600) // 1min, 2min, 4min, 8min, 10min max
if (Date.now() - lastAttemptTime < backoffDelay * 1000) {
  continue // Skip esta iteración
}
```

### 5. ⚠️ **Logging no estructurado**
**Problema:** Mix de `console.log`, `console.warn`, `console.error` sin contexto.

**Solución:** Logging estructurado:
```typescript
logger.info('anchor_submitted', {
  anchorId: anchor.id,
  documentHash: anchor.document_hash,
  txHash,
  network: 'polygon-mainnet'
})

logger.error('anchor_failed', {
  anchorId: anchor.id,
  error: error.message,
  attempts,
  duration: Date.now() - startTime
})
```

### 6. ⚠️ **No hay métricas de observabilidad**
**Falta:**
- Duración promedio de confirmación (Bitcoin vs Polygon)
- Tasa de éxito/falla por tipo de anchor
- Costo por transacción (gas usado)
- Health checks de calendars/RPC providers

---

## 🔧 Plan de Remediación

### Prioridad Alta (P0) - Bugs que rompen funcionalidad
- [ ] **P0-1:** Validación de `documentHash` en anchor-polygon (igual a Bitcoin)
- [ ] **P0-2:** Update de `user_documents` al encolar Polygon anchor
- [ ] **P0-3:** Transacción atómica en process-polygon-anchors

### Prioridad Media (P1) - Mejoras de robustez
- [ ] **P1-1:** Exponential backoff en retries de Polygon
- [ ] **P1-2:** Logging estructurado con niveles + contexto
- [ ] **P1-3:** Health checks de infraestructura (calendars, RPC)

### Prioridad Baja (P2) - Observabilidad
- [ ] **P2-1:** Métricas de duración/tasa de éxito
- [ ] **P2-2:** Dashboard de anchoring status
- [ ] **P2-3:** Alertas proactivas (Slack/Email)

---

## 📈 Métricas de Observabilidad (Propuestas)

### Tabla: `anchor_metrics`
```sql
CREATE TABLE anchor_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anchor_id uuid REFERENCES anchors(id),
  metric_type text NOT NULL, -- 'submission', 'confirmation', 'failure'
  anchor_type text NOT NULL, -- 'opentimestamps', 'polygon'
  duration_ms integer,
  attempts integer,
  error_code text,
  metadata jsonb,
  created_at timestamp DEFAULT now()
);

-- Ejemplo de query útil:
SELECT
  anchor_type,
  AVG(duration_ms) as avg_duration,
  COUNT(*) FILTER (WHERE metric_type = 'confirmation') as confirmed,
  COUNT(*) FILTER (WHERE metric_type = 'failure') as failed
FROM anchor_metrics
WHERE created_at > now() - interval '24 hours'
GROUP BY anchor_type;
```

### Health Checks
```typescript
// Agregar en process-*-anchors
async function checkHealth() {
  const checks = {
    calendars: await checkCalendars(),
    polygonRpc: await checkPolygonRpc(),
    database: await checkDatabase()
  }
  
  await supabase.from('health_checks').insert({
    service: 'anchoring',
    checks,
    status: Object.values(checks).every(c => c.ok) ? 'healthy' : 'degraded'
  })
}
```

---

## 🎓 Lecciones Aprendidas

### ✅ Buenas Prácticas Existentes
1. **Separación de responsabilidades:** anchor-* encolan, process-* procesan
2. **Redundancia:** Múltiples calendars OpenTimestamps
3. **Fallback strategy:** Polygon cubre si Bitcoin falla
4. **Validación temprana:** Checks de formato antes de procesar

### ⚠️ Anti-Patrones a Evitar
1. **Silent failures:** Errores sin logging adecuado
2. **Split updates:** Múltiples UPDATEs sin transacción
3. **Hard-coded retries:** Sin exponential backoff
4. **Missing observability:** No hay métricas ni health checks

### 📚 Recomendaciones Generales
1. **Always log with context:** `{ anchorId, userId, duration, error }`
2. **Use atomic transactions:** Especialmente cuando afecta múltiples tablas
3. **Implement circuit breakers:** Para RPC providers flaky
4. **Monitor everything:** Métricas + alertas + dashboards
5. **Document failure modes:** "Qué pasa cuando X falla"

---

## 📞 Contacto y Seguimiento

**DEV 4 — Forense / Infra & Blockchain**

- Bugs reportados: 6 críticos
- PRs de hardening: Pendientes
- Documentación técnica: ✅ Completado

**Próximos pasos:**
1. Review de este documento con el equipo
2. Implementación de fixes P0 (1-2 días)
3. Testing de transacciones atómicas
4. Deploy gradual (canary → prod)

---

*Última actualización: 2025-12-13 23:42 UTC*
