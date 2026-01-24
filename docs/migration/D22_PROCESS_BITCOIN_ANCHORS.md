# D22 - Process Bitcoin Anchors (Contrato)

**Fecha de inicio:** 2026-01-24  
**Fase:** 1 - Contrato (DEFINICION)  
**Grupo:** 4 - Anchoring / Infra (worker)

---

## Que decide

**Decision:** "¿Se debe enviar/verificar un anchor Bitcoin vía OpenTimestamps?"

**Contexto:**  
Worker periódico que:
1) Envía anchors `queued` a OpenTimestamps.  
2) Verifica anchors `pending/processing` y confirma cuando el proof se
actualiza (upgrade) y hay txid/height.

```
Cron/Edge: process-bitcoin-anchors
         ↓
     [D22: Submit?]  → anchors UPDATE (pending, ots_proof)
     [D22: Confirm?] → anchors UPDATE (confirmed)
                       user_documents UPDATE
                       document_entities.events APPEND (anchor)
```

**Responsabilidad actual:** Edge Function  
`supabase/functions/process-bitcoin-anchors/index.ts`

---

## Inputs

### Datos requeridos (query):
- **anchors**:
  - `anchor_status = 'queued'` (submit)
  - `anchor_status in ('pending','processing')` (verify)
- **ots_proof**, **ots_calendar_url** (para verify)

### Contexto adicional:
- **OpenTimestamps calendar**
- **Mempool API** (block height / confirmed_at)
- **user_documents** (bitcoin_status, cancelado)
- **document_entities** (witness_hash)

---

## Output

### Resultado (si decision es TRUE):

**Submit path**
```sql
UPDATE anchors
SET anchor_status='pending', ots_proof=..., ots_calendar_url=...
```

**Confirm path**
```sql
UPDATE anchors
SET anchor_status='confirmed', bitcoin_confirmed_at=...
```

**Evento canónico**
```text
document_entities.events APPEND:
{ kind: 'anchor', network: 'bitcoin', witness_hash, txid, block_height, confirmed_at }
```

---

## Invariantes

1) **Auth**
- Solo service role (cron/worker).

2) **Cancelación respeta usuario**
- Si `user_documents.bitcoin_status = 'cancelled'`, se ignora confirmación tardía.

3) **Timeout**
- `MAX_VERIFY_ATTEMPTS` (24h) → marca `failed` pero mantiene documento válido si Polygon ya está.

4) **Confirmación estricta**
- Solo confirma si proof se actualiza (upgrade) o se obtiene txid/height.

5) **Evento canónico best-effort**
- Si falla append a events[], no revierte legacy.

---

## Que NO decide

- No crea anchors Polygon.
- No cambia `protection_level` (se deriva).
- No decide UI final ni artifact.
- No valida TSA.

---

## Regla canonica (formal)

```typescript
export interface ProcessBitcoinAnchorInput {
  anchor: {
    id: string;
    anchor_status: string;
    ots_proof?: string | null;
    ots_calendar_url?: string | null;
    bitcoin_attempts?: number | null;
  };
  userDoc: {
    bitcoin_status?: string | null;
    has_polygon_anchor?: boolean | null;
  } | null;
  verification: {
    confirmed: boolean;
    txid?: string | null;
    blockHeight?: number | null;
    upgraded?: boolean;
  };
  maxAttempts: number;
}

export const shouldSubmitBitcoinAnchor = (input: ProcessBitcoinAnchorInput): boolean => {
  return input.anchor.anchor_status === 'queued';
};

export const shouldConfirmBitcoinAnchor = (input: ProcessBitcoinAnchorInput): boolean => {
  if (input.userDoc?.bitcoin_status === 'cancelled') return false;
  if (!input.verification.confirmed) return false;
  const attempts = (input.anchor.bitcoin_attempts ?? 0) + 1;
  if (attempts > input.maxAttempts) return false;
  return true;
};
```

---

## Casos de prueba

**Test 1:** Submit queued
```typescript
Input: anchor_status='queued'
Output: shouldSubmit = true
```

**Test 2:** Confirmado con upgraded proof
```typescript
Input: verification.confirmed=true, not cancelled
Output: shouldConfirm = true
```

**Test 3:** Cancelado por usuario
```typescript
Input: userDoc.bitcoin_status='cancelled'
Output: shouldConfirm = false
```

**Test 4:** Timeout
```typescript
Input: attempts > maxAttempts
Output: shouldConfirm = false
```

