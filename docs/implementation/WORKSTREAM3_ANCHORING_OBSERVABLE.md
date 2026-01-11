# WORKSTREAM 3: Anchoring Observable + Health

**Estado:** 🟡 EN PROGRESO
**Fecha:** 2026-01-11
**Objetivo:** Hacer el anchoring visible, auditable y honesto

---

## 🎯 OBJETIVOS (DoD)

✅ **Definition of Done:**
- Un documento siempre puede mostrar "en qué capa está" (ACTIVE/REINFORCED/TOTAL)
- Si falló el anchoring, el usuario sabe qué hizo el sistema
- Healthcheck panel permite diagnosticar sin "SSH mental"
- UI no muestra "verde" si está pending (honestidad first)

---

## 📋 TAREAS

### ✅ TAREA 1: Fix Cron Auth + Cleanup Legacy (COMPLETADA)

**Estado:** ✅ DONE

**Archivos creados:**
- `scripts/fix-all-blockchain-crons.sql` - Fix auth de ambos crons
- `scripts/cleanup-legacy-polygon-pending.sql` - Limpiar Polygon legacy
- `scripts/cleanup-legacy-bitcoin-pending.sql` - Limpiar Bitcoin legacy
- `BLOCKCHAIN_ANCHORING_FIX.md` - Guía completa

**Problema resuelto:**
```
ERROR: unrecognized configuration parameter "app.settings.service_role_key"
```

**Solución:** Recrear cron jobs con `service_role_key` hardcodeado.

---

### 🔄 TAREA 2: Eventos anchor.attempt / anchor.failed

**Objetivo:** Registrar TODOS los intentos de anchoring, no solo los exitosos.

#### 2.1 Extender Event Logger

**Archivo:** `client/src/utils/eventLogger.ts`

Agregar nuevos eventos:

```typescript
export const EVENT_TYPES = {
  // ... existing
  ANCHOR_ATTEMPT: 'anchor.attempt',   // ← NUEVO
  ANCHOR_CONFIRMED: 'anchor.confirmed', // ← NUEVO (renombrar de ANCHORED_*)
  ANCHOR_FAILED: 'anchor.failed',     // ← NUEVO
} as const;
```

**Helpers nuevos:**

```typescript
export const EventHelpers = {
  // ... existing

  logAnchorAttempt: (
    documentId: string,
    network: 'polygon' | 'bitcoin',
    witnessHash: string,
    metadata: Record<string, unknown> = {}
  ) => logEvent(EVENT_TYPES.ANCHOR_ATTEMPT, documentId, {
    metadata: {
      network,
      witness_hash: witnessHash,
      status: 'pending',
      attempted_at: new Date().toISOString(),
      ...metadata
    }
  }),

  logAnchorConfirmed: (
    documentId: string,
    network: 'polygon' | 'bitcoin',
    txHash: string,
    blockHeight: number | null,
    witnessHash: string,
    metadata: Record<string, unknown> = {}
  ) => logEvent(EVENT_TYPES.ANCHOR_CONFIRMED, documentId, {
    metadata: {
      network,
      witness_hash: witnessHash,
      txid: txHash,
      block_height: blockHeight,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      ...metadata
    }
  }),

  logAnchorFailed: (
    documentId: string,
    network: 'polygon' | 'bitcoin',
    error: string,
    witnessHash: string,
    metadata: Record<string, unknown> = {}
  ) => logEvent(EVENT_TYPES.ANCHOR_FAILED, documentId, {
    metadata: {
      network,
      witness_hash: witnessHash,
      status: 'failed',
      error_message: error,
      failed_at: new Date().toISOString(),
      ...metadata
    }
  }),
};
```

#### 2.2 Integrar en Workers

**Archivo:** `supabase/functions/_legacy/process-polygon-anchors/index.ts`

**Cambios:**

1. **Al detectar documento con `polygon_status='pending'`:**
   ```typescript
   // Log attempt (si no existe ya)
   await EventHelpers.logAnchorAttempt(docId, 'polygon', witnessHash, {
     rpc_url: POLYGON_RPC_URL,
     contract_address: POLYGON_CONTRACT_ADDRESS
   });
   ```

2. **Al confirmar tx exitosa:**
   ```typescript
   // Log confirmed
   await EventHelpers.logAnchorConfirmed(docId, 'polygon', txHash, blockHeight, witnessHash, {
     gas_used: receipt.gasUsed,
     confirmations: receipt.confirmations
   });
   ```

3. **Al fallar:**
   ```typescript
   // Log failed
   await EventHelpers.logAnchorFailed(docId, 'polygon', error.message, witnessHash, {
     error_code: error.code,
     retry_count: retryCount
   });
   ```

**Lo mismo para `process-bitcoin-anchors/index.ts`**

#### 2.3 Testing

```sql
-- Ver eventos de un documento
SELECT
  kind,
  at,
  metadata->>'network' as network,
  metadata->>'status' as status,
  metadata->>'error_message' as error
FROM events
WHERE document_id = 'doc-id-here'
  AND kind IN ('anchor.attempt', 'anchor.confirmed', 'anchor.failed')
ORDER BY at ASC;
```

---

### 🔄 TAREA 3: Health Panel (Admin)

**Objetivo:** Dashboard de salud del sistema de anchoring.

#### 3.1 Backend: Health Check Edge Function

**Archivo:** `supabase/functions/health-check/index.ts` (NUEVO)

```typescript
import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Check cron jobs
    const { data: cronJobs } = await supabase.rpc('cron_job_status');

    // 2. Check pending documents
    const { data: pendingDocs } = await supabase
      .from('user_documents')
      .select('polygon_status, bitcoin_status')
      .or('polygon_status.eq.pending,bitcoin_status.eq.pending');

    // 3. Check recent anchors (last 24h)
    const { data: recentAnchors } = await supabase
      .from('anchors')
      .select('blockchain, anchor_status, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // 4. Check last successful anchor per network
    const { data: lastPolygonAnchor } = await supabase
      .from('anchors')
      .select('created_at, confirmed_at')
      .eq('blockchain', 'polygon')
      .eq('anchor_status', 'confirmed')
      .order('confirmed_at', { ascending: false })
      .limit(1)
      .single();

    const { data: lastBitcoinAnchor } = await supabase
      .from('anchors')
      .select('created_at, confirmed_at')
      .eq('blockchain', 'bitcoin')
      .eq('anchor_status', 'confirmed')
      .order('confirmed_at', { ascending: false })
      .limit(1)
      .single();

    // 5. Build health report
    const health = {
      status: 'healthy', // Will be computed
      timestamp: new Date().toISOString(),
      crons: {
        polygon: {
          active: cronJobs?.find(j => j.jobname === 'process-polygon-anchors')?.active || false,
          last_run: null, // TODO: Get from cron.job_run_details
          status: 'unknown'
        },
        bitcoin: {
          active: cronJobs?.find(j => j.jobname === 'process-bitcoin-anchors')?.active || false,
          last_run: null,
          status: 'unknown'
        }
      },
      pending: {
        polygon: pendingDocs?.filter(d => d.polygon_status === 'pending').length || 0,
        bitcoin: pendingDocs?.filter(d => d.bitcoin_status === 'pending').length || 0
      },
      recent_anchors_24h: {
        polygon: recentAnchors?.filter(a => a.blockchain === 'polygon').length || 0,
        bitcoin: recentAnchors?.filter(a => a.blockchain === 'bitcoin').length || 0
      },
      last_success: {
        polygon: lastPolygonAnchor?.confirmed_at || null,
        bitcoin: lastBitcoinAnchor?.confirmed_at || null
      }
    };

    // Determine overall status
    const polygonStale = !lastPolygonAnchor ||
      (Date.now() - new Date(lastPolygonAnchor.confirmed_at).getTime() > 60 * 60 * 1000); // 1h
    const bitcoinStale = !lastBitcoinAnchor ||
      (Date.now() - new Date(lastBitcoinAnchor.confirmed_at).getTime() > 24 * 60 * 60 * 1000); // 24h

    if (polygonStale || bitcoinStale) {
      health.status = 'degraded';
    }

    if (!health.crons.polygon.active || !health.crons.bitcoin.active) {
      health.status = 'unhealthy';
    }

    return new Response(JSON.stringify(health), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

#### 3.2 Frontend: Health Panel Page

**Archivo:** `client/src/pages/HealthPanel.tsx` (NUEVO)

```typescript
import React, { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabaseClient';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'error';
  timestamp: string;
  crons: {
    polygon: { active: boolean; last_run: string | null; status: string };
    bitcoin: { active: boolean; last_run: string | null; status: string };
  };
  pending: {
    polygon: number;
    bitcoin: number;
  };
  recent_anchors_24h: {
    polygon: number;
    bitcoin: number;
  };
  last_success: {
    polygon: string | null;
    bitcoin: string | null;
  };
}

export function HealthPanel() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHealth();
    // Refresh every 30 seconds
    const interval = setInterval(loadHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadHealth() {
    try {
      const supabase = getSupabase();
      const { data, error: fetchError } = await supabase.functions.invoke('health-check');

      if (fetchError) throw fetchError;

      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health status');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading health status...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!health) return null;

  const statusColor = {
    healthy: 'green',
    degraded: 'yellow',
    unhealthy: 'red',
    error: 'red'
  }[health.status];

  const statusIcon = {
    healthy: '✅',
    degraded: '⚠️',
    unhealthy: '❌',
    error: '💥'
  }[health.status];

  return (
    <div className="health-panel">
      <h1>System Health {statusIcon}</h1>
      <div className={`status-badge status-${statusColor}`}>
        {health.status.toUpperCase()}
      </div>

      <section>
        <h2>Cron Jobs</h2>
        <table>
          <tbody>
            <tr>
              <td>Polygon Worker</td>
              <td>{health.crons.polygon.active ? '✅ Active' : '❌ Inactive'}</td>
            </tr>
            <tr>
              <td>Bitcoin Worker</td>
              <td>{health.crons.bitcoin.active ? '✅ Active' : '❌ Inactive'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Pending Documents</h2>
        <table>
          <tbody>
            <tr>
              <td>Polygon</td>
              <td className={health.pending.polygon > 10 ? 'warning' : ''}>
                {health.pending.polygon}
              </td>
            </tr>
            <tr>
              <td>Bitcoin</td>
              <td className={health.pending.bitcoin > 10 ? 'warning' : ''}>
                {health.pending.bitcoin}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Last 24h Activity</h2>
        <table>
          <tbody>
            <tr>
              <td>Polygon Anchors</td>
              <td>{health.recent_anchors_24h.polygon}</td>
            </tr>
            <tr>
              <td>Bitcoin Anchors</td>
              <td>{health.recent_anchors_24h.bitcoin}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Last Successful Anchor</h2>
        <table>
          <tbody>
            <tr>
              <td>Polygon</td>
              <td>{health.last_success.polygon ? new Date(health.last_success.polygon).toLocaleString() : 'Never'}</td>
            </tr>
            <tr>
              <td>Bitcoin</td>
              <td>{health.last_success.bitcoin ? new Date(health.last_success.bitcoin).toLocaleString() : 'Never'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer>
        <small>Last updated: {new Date(health.timestamp).toLocaleString()}</small>
        <button onClick={loadHealth}>Refresh</button>
      </footer>
    </div>
  );
}
```

#### 3.3 Route

**Archivo:** `client/src/App.tsx` (agregar ruta)

```typescript
import { HealthPanel } from './pages/HealthPanel';

// ... en routes
<Route path="/admin/health" element={<HealthPanel />} />
```

---

### 🔄 TAREA 4: UI Honesta (No Optimistic)

**Objetivo:** Mostrar estados REALES, no optimistas.

#### 4.1 Identificar Lugares con Optimistic UI

Buscar código que muestre "confirmado" antes de estar realmente confirmado:

```typescript
// ❌ MAL (optimistic)
polygon_status: 'confirmed' // Sin verificar

// ✅ BIEN (honest)
polygon_status: 'pending' // Hasta que worker confirme
```

#### 4.2 Fix DocumentsPage Status Badges

**Archivo:** `client/src/pages/DocumentsPage.tsx`

**ANTES:**
```typescript
{hasPolygonAnchor && <Badge>Polygon ✅</Badge>}
```

**DESPUÉS:**
```typescript
{doc.polygon_status === 'confirmed' && <Badge variant="success">Polygon ✅</Badge>}
{doc.polygon_status === 'pending' && <Badge variant="warning">Polygon ⏳</Badge>}
{doc.polygon_status === 'failed' && <Badge variant="error">Polygon ❌</Badge>}
```

#### 4.3 Fix LegalCenterModalV2 UI

**Archivo:** `client/src/components/LegalCenterModalV2.tsx`

No mostrar "Polygon confirmado" hasta que el worker actualice `polygon_status='confirmed'`.

**Agregar realtime subscription para updates:**

```typescript
useEffect(() => {
  if (!canonicalDocumentId) return;

  const supabase = getSupabase();

  const subscription = supabase
    .channel(`document:${canonicalDocumentId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'user_documents',
      filter: `id=eq.${canonicalDocumentId}`
    }, (payload) => {
      // Update local state when polygon_status changes
      if (payload.new.polygon_status !== payload.old.polygon_status) {
        console.log('Polygon status updated:', payload.new.polygon_status);
        // Trigger UI update
      }
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [canonicalDocumentId]);
```

---

### 🔄 TAREA 5: Layer Visibility Component

**Objetivo:** Componente que muestra en qué capa está el documento.

#### 5.1 Protection Layer Badge Component

**Archivo:** `client/src/components/ProtectionLayerBadge.tsx` (NUEVO)

```typescript
import React from 'react';
import { Shield } from 'lucide-react';

interface ProtectionLayerBadgeProps {
  layer: 'NONE' | 'ACTIVE' | 'REINFORCED' | 'TOTAL';
  polygonStatus?: 'pending' | 'confirmed' | 'failed' | null;
  bitcoinStatus?: 'pending' | 'confirmed' | 'failed' | null;
  showDetails?: boolean;
}

export function ProtectionLayerBadge({
  layer,
  polygonStatus,
  bitcoinStatus,
  showDetails = false
}: ProtectionLayerBadgeProps) {
  const layerConfig = {
    NONE: { color: 'gray', icon: '⚪', label: 'Sin protección' },
    ACTIVE: { color: 'blue', icon: '🔵', label: 'TSA (RFC 3161)' },
    REINFORCED: { color: 'purple', icon: '🟣', label: 'TSA + Polygon' },
    TOTAL: { color: 'green', icon: '🟢', label: 'TSA + Polygon + Bitcoin' }
  };

  const config = layerConfig[layer];

  return (
    <div className={`protection-layer-badge layer-${config.color}`}>
      <div className="layer-primary">
        <Shield className="layer-icon" />
        <span className="layer-label">{config.icon} {config.label}</span>
      </div>

      {showDetails && (
        <div className="layer-details">
          {polygonStatus && (
            <div className="status-item">
              <span>Polygon:</span>
              {polygonStatus === 'confirmed' && <span className="status-confirmed">✅ Confirmado</span>}
              {polygonStatus === 'pending' && <span className="status-pending">⏳ Confirmando...</span>}
              {polygonStatus === 'failed' && <span className="status-failed">❌ Falló</span>}
            </div>
          )}

          {bitcoinStatus && (
            <div className="status-item">
              <span>Bitcoin:</span>
              {bitcoinStatus === 'confirmed' && <span className="status-confirmed">✅ Confirmado</span>}
              {bitcoinStatus === 'pending' && <span className="status-pending">⏳ Confirmando (puede tardar horas)...</span>}
              {bitcoinStatus === 'failed' && <span className="status-failed">❌ Falló</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

#### 5.2 Usage

```typescript
// En DocumentsPage o LegalCenterModalV2
<ProtectionLayerBadge
  layer={document.protection_level}
  polygonStatus={document.polygon_status}
  bitcoinStatus={document.bitcoin_status}
  showDetails={true}
/>
```

---

## 📁 ARCHIVOS A CREAR/MODIFICAR

### Nuevos
- ✅ `docs/implementation/WORKSTREAM3_ANCHORING_OBSERVABLE.md` - Esta especificación
- 🔄 `supabase/functions/health-check/index.ts` - Edge Function de health
- 🔄 `client/src/pages/HealthPanel.tsx` - UI de health panel
- 🔄 `client/src/components/ProtectionLayerBadge.tsx` - Badge de capas

### Modificados
- 🔄 `client/src/utils/eventLogger.ts` - Agregar eventos anchor.*
- 🔄 `supabase/functions/_legacy/process-polygon-anchors/index.ts` - Logging de eventos
- 🔄 `supabase/functions/_legacy/process-bitcoin-anchors/index.ts` - Logging de eventos
- 🔄 `client/src/pages/DocumentsPage.tsx` - UI honesta de status
- 🔄 `client/src/components/LegalCenterModalV2.tsx` - Realtime updates + UI honesta
- 🔄 `client/src/App.tsx` - Agregar ruta /admin/health

---

## ✅ TESTING CHECKLIST

### Eventos
- [ ] Crear documento con Polygon habilitado
- [ ] Verificar evento `anchor.attempt` se crea
- [ ] Esperar confirmación
- [ ] Verificar evento `anchor.confirmed` se crea
- [ ] Forzar fallo (RPC down)
- [ ] Verificar evento `anchor.failed` se crea

### Health Panel
- [ ] Acceder a `/admin/health`
- [ ] Ver status general (healthy/degraded/unhealthy)
- [ ] Ver cron jobs activos
- [ ] Ver documentos pendientes
- [ ] Ver último anchor exitoso
- [ ] Auto-refresh cada 30 seg

### UI Honesta
- [ ] Documento pending muestra ⏳, no ✅
- [ ] Documento confirmed muestra ✅
- [ ] Documento failed muestra ❌
- [ ] Realtime update funciona (status cambia sin refresh)

### Layer Visibility
- [ ] Badge muestra layer correcto (ACTIVE/REINFORCED/TOTAL)
- [ ] Detalles muestran status de Polygon y Bitcoin
- [ ] Pending en Bitcoin muestra mensaje "puede tardar horas"

---

## 🚀 DEPLOYMENT ORDER

1. **Backend primero:**
   - Deploy `health-check` Edge Function
   - Modificar `process-polygon-anchors` con logging
   - Modificar `process-bitcoin-anchors` con logging

2. **Frontend después:**
   - Extender `eventLogger.ts`
   - Crear `ProtectionLayerBadge.tsx`
   - Crear `HealthPanel.tsx`
   - Fix `DocumentsPage.tsx` UI
   - Fix `LegalCenterModalV2.tsx` UI

3. **Testing final:**
   - Proteger documento end-to-end
   - Verificar todos los eventos
   - Verificar health panel
   - Verificar UI honesta

---

**Próximo paso:** Implementar Tarea 2 (Eventos anchor.attempt/failed)
