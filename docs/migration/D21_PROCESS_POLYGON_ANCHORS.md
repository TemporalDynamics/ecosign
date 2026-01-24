# D21 - Process Polygon Anchors (Contrato)

**Fecha de inicio:** 2026-01-24  
**Fase:** 1 - Contrato (DEFINICION)  
**Grupo:** 4 - Anchoring / Infra (worker)

---

## Que decide

**Decision:** "¿Se debe confirmar/finalizar un anchor Polygon pendiente?"

**Contexto:**  
Worker periódico que verifica transacciones en Polygon y, cuando están
confirmadas, actualiza tablas legacy y agrega el evento canónico `anchor`
en `document_entities.events`.

```
Cron/Edge: process-polygon-anchors
         ↓
     [D21: Confirm?] → anchors UPDATE (confirmed)
                      user_documents UPDATE
                      document_entities.events APPEND (anchor)
```

**Responsabilidad actual:** Edge Function  
`supabase/functions/process-polygon-anchors/index.ts`

---

## Inputs

### Datos requeridos (query):
- **anchors**:
  - `anchor_type = 'polygon'`
  - `anchor_status in ('pending','processing')`
  - `polygon_tx_hash` presente

### Contexto adicional:
- **Polygon RPC** (receipt + block timestamp)
- **document_entities** (witness_hash)
- **user_documents** (document_entity_id, status legacy)

---

## Output

### Resultado (si decision es TRUE):

1) **Actualizar anchor + legacy**
```sql
UPDATE anchors
SET anchor_status='confirmed', polygon_status='confirmed', polygon_confirmed_at=...
```

2) **Actualizar user_documents**
```sql
UPDATE user_documents
SET has_polygon_anchor=true, overall_status='certified', download_enabled=true
```

3) **Evento canónico**
```text
document_entities.events APPEND:
{ kind: 'anchor', network: 'polygon', witness_hash, txid, block_height, confirmed_at }
```

---

## Invariantes

1) **Auth**
- Solo service role (cron/worker) puede ejecutar.

2) **Anchor válido**
- `anchor_type = 'polygon'`.
- Debe existir `polygon_tx_hash`.

3) **Receipt confirmado**
- `receipt.status === 1`.
- `confirmed_at >= created_at` (causalidad).

4) **Retry & timeout**
- Se respeta `RETRY_CONFIGS.polygon` y backoff.
- Si supera max attempts → `failed`.

5) **Evento canónico best-effort**
- Si falla append en events[], no revierte legacy.

---

## Que NO decide

- No crea anchors (eso es `anchor-polygon` / `submit-anchor-polygon`).
- No cambia `protection_level` (se deriva).
- No decide UI final ni artifact.
- No valida TSA.

---

## Regla canonica (formal)

```typescript
export interface ProcessPolygonAnchorInput {
  anchor: {
    id: string;
    anchor_type: string;
    polygon_tx_hash?: string | null;
    polygon_attempts?: number | null;
  };
  receipt: {
    status?: number | null;
    blockNumber?: number | null;
  } | null;
  maxAttempts: number;
}

export const shouldConfirmPolygonAnchor = (input: ProcessPolygonAnchorInput): boolean => {
  if (input.anchor.anchor_type !== 'polygon') return false;
  if (!input.anchor.polygon_tx_hash) return false;
  if (!input.receipt) return false;
  if (input.receipt.status !== 1) return false;

  const attempts = (input.anchor.polygon_attempts ?? 0) + 1;
  if (attempts > input.maxAttempts) return false;

  return true;
};
```

---

## Casos de prueba

**Test 1:** Receipt confirmado
```typescript
Input: anchor polygon con tx_hash + receipt.status=1
Output: true
```

**Test 2:** Receipt pendiente
```typescript
Input: receipt = null
Output: false
```

**Test 3:** Receipt fallido
```typescript
Input: receipt.status=0
Output: false
```

**Test 4:** Max attempts superado
```typescript
Input: attempts > max
Output: false
```

