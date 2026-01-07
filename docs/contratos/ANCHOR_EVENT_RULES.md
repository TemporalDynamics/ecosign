# 📜 ANCHOR EVENT RULES

**Versión:** v1.0
**Estado:** Canónico
**Scope:** Polygon / Bitcoin anchoring
**Modelo:** Append-only / Event-driven
**Entidad raíz:** `document_entities`

---

## 1. Propósito

Definir cómo se registran los anchors criptográficos (Polygon, Bitcoin, futuros registros) dentro del ledger canónico de eventos de un documento (`document_entities.events[]`), garantizando:

- ✅ **Unicidad de verdad**
- ✅ **Trazabilidad temporal**
- ✅ **Consistencia probatoria**
- ✅ **Compatibilidad con infraestructura legacy**

Este contrato **NO define** cómo se envían transacciones ni cómo funcionan las blockchains.
Define **cómo se registra el hecho probatorio** de que un `witness_hash` fue anclado.

---

## 2. Principios Fundamentales

### 2.1 La verdad NO vive en la blockchain

- La verdad canónica es el `witness_hash`
- Las blockchains son **testigos externos**
- El anchor no crea verdad, **la refuerza**

### 2.2 Append-Only absoluto

- Un anchor **nunca se edita**
- **Nunca se borra**
- **Nunca se sobrescribe**
- Solo se agregan eventos

### 2.3 Monotonía probatoria

Los niveles de protección solo pueden **subir**, nunca bajar:

```
NONE → TSA → POLYGON → BITCOIN
```

Un evento posterior **no invalida** uno anterior.

---

## 3. Ubicación Canónica

Todos los anchors deben registrarse como eventos dentro de:

```sql
document_entities.events[]
```

Las tablas legacy (`anchors`, `anchor_states`) **NO son fuente de verdad**.
Son detalle transaccional / operacional.

---

## 4. Tipo de Evento

### 4.1 Nombre canónico

```json
"kind": "anchor"
```

### 4.2 Estructura del evento

```json
{
  "kind": "anchor",
  "at": "2026-01-06T03:12:45.000Z",
  "anchor": {
    "network": "polygon" | "bitcoin",
    "witness_hash": "hex-string",
    "txid": "string",
    "block_height": 123456,
    "confirmed_at": "2026-01-06T03:12:40.000Z"
  }
}
```

---

## 5. Campos — Reglas estrictas

### 5.1 `network`

- ✅ **REQUIRED**
- Enum cerrado:
  - `"polygon"`
  - `"bitcoin"`
- Case-sensitive
- Inmutable

### 5.2 `witness_hash`

- ✅ **REQUIRED**
- Debe ser **idéntico** a:
  ```sql
  document_entities.witness_hash
  ```
- Si no coincide → evento **inválido**
- No se permite anchoring sobre:
  - ❌ `source_hash`
  - ❌ `signed_hash`
  - ❌ `composite_hash`

**👉 Regla crítica:**

> Todo anchor se hace sobre la **verdad canónica**, nunca sobre derivados ambiguos.

### 5.3 `txid`

- ✅ **REQUIRED**
- String opaco
- El sistema **no interpreta** su formato
- Puede ser:
  - Hash de transacción
  - Batch identifier (Bitcoin / OTS)

### 5.4 `block_height`

- ⚪ **OPTIONAL** pero recomendado
- Número entero positivo
- Si no está disponible al momento del evento:
  - Puede agregarse en un evento posterior
  - **Nunca se edita** el evento original

### 5.5 `confirmed_at`

- ✅ **REQUIRED**
- Timestamp UTC
- Representa el momento de **confirmación externa**
- **NO es** `at`

### 5.6 `at`

- Timestamp del momento de registro **interno**
- Siempre generado por el sistema
- Puede diferir de `confirmed_at`

---

## 6. Reglas de Validación

### 6.1 Consistencia de hash

```typescript
event.anchor.witness_hash === document_entities.witness_hash
```

Si falla → evento **rechazado**.

### 6.2 Unicidad lógica

Para un mismo documento:

- Se permite **máximo un anchor por network**
- Intentar registrar un segundo:
  - ❌ NO falla
  - ❌ NO se registra
  - ✅ Se ignora idempotentemente

### 6.3 Idempotencia

Registrar el mismo anchor (mismo `network` + `txid`) múltiples veces:

- ✅ No duplica eventos
- ✅ No altera estado
- ✅ Resultado determinístico

---

## 7. Relación con Estados de Protección

Los eventos **NO almacenan estados**.
Los estados **se derivan**.

Ejemplo de derivación:

```typescript
function deriveProtectionLevel(events: Event[]): ProtectionLevel {
  const hasBitcoinAnchor = events.some(e =>
    e.kind === 'anchor' && e.anchor.network === 'bitcoin'
  );
  const hasPolygonAnchor = events.some(e =>
    e.kind === 'anchor' && e.anchor.network === 'polygon'
  );
  const hasTsaEvent = events.some(e => e.kind === 'tsa');

  if (hasBitcoinAnchor) return "TOTAL";
  if (hasPolygonAnchor) return "REINFORCED";
  if (hasTsaEvent) return "ACTIVE";
  return "NONE";
}
```

**👉 El estado no es persistido, es una función de eventos.**

---

## 8. Compatibilidad Legacy (Transitoria)

Durante la migración:

- ✅ `anchors` / `anchor_states` siguen existiendo
- ✅ Dual-write permitido
- UI debe:
  - **Leer `events[]`** (primero)
  - Fallback a legacy solo si no hay eventos

---

## 9. Lo que este contrato PROHÍBE explícitamente

- ❌ Editar anchors
- ❌ Borrar anchors
- ❌ Reemplazar anchors
- ❌ Anclar `source_hash`
- ❌ Anclar `signed_hash`
- ❌ Inferir verdad desde blockchain
- ❌ Usar blockchain como fuente de verdad

---

## 10. Garantías que este contrato ofrece

- ✅ **Verdad única**
- ✅ **Trazabilidad temporal completa**
- ✅ **Prueba independiente**
- ✅ **Auditoría determinística**
- ✅ **Evolución sin ruptura**
- ✅ **Compatibilidad hacia atrás**

---

## 11. Nota final (filosófica, pero importante)

> **El documento no es verdadero porque está en Bitcoin.**
> **Está en Bitcoin porque ya era verdadero.**

---

## Apéndice A: Ejemplo Completo

### Evento Polygon

```json
{
  "kind": "anchor",
  "at": "2026-01-06T03:15:23.456Z",
  "anchor": {
    "network": "polygon",
    "witness_hash": "a3f5c89e42b1d6f7e8c9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1",
    "txid": "0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
    "block_height": 52341567,
    "confirmed_at": "2026-01-06T03:14:58.000Z"
  }
}
```

### Evento Bitcoin

```json
{
  "kind": "anchor",
  "at": "2026-01-06T15:42:11.789Z",
  "anchor": {
    "network": "bitcoin",
    "witness_hash": "a3f5c89e42b1d6f7e8c9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1",
    "txid": "batch-2026-01-06-12345",
    "block_height": 825432,
    "confirmed_at": "2026-01-06T15:30:00.000Z"
  }
}
```

### Secuencia temporal completa

```json
{
  "id": "d03545b7-e1e3-4124-9cd4-ddc7206c14f5",
  "witness_hash": "a3f5c89e42b1d6f7e8c9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1",
  "events": [
    {
      "kind": "tsa",
      "at": "2026-01-06T02:57:56.285Z",
      "witness_hash": "a3f5c89e42b1d6f7e8c9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1",
      "tsa": { "token_b64": "...", "gen_time": "2026-01-06T02:57:50.000Z" }
    },
    {
      "kind": "anchor",
      "at": "2026-01-06T03:15:23.456Z",
      "anchor": {
        "network": "polygon",
        "witness_hash": "a3f5c89e42b1d6f7e8c9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1",
        "txid": "0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
        "block_height": 52341567,
        "confirmed_at": "2026-01-06T03:14:58.000Z"
      }
    },
    {
      "kind": "anchor",
      "at": "2026-01-06T15:42:11.789Z",
      "anchor": {
        "network": "bitcoin",
        "witness_hash": "a3f5c89e42b1d6f7e8c9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1",
        "txid": "batch-2026-01-06-12345",
        "block_height": 825432,
        "confirmed_at": "2026-01-06T15:30:00.000Z"
      }
    }
  ]
}
```

**Derivación:**
- TSA → `ACTIVE`
- TSA + Polygon → `REINFORCED`
- TSA + Polygon + Bitcoin → `TOTAL`

---

## Apéndice B: Casos de Error

### Error: witness_hash no coincide

```typescript
// ENTRADA
{
  "kind": "anchor",
  "anchor": {
    "network": "polygon",
    "witness_hash": "WRONG_HASH",  // ❌
    "txid": "0x..."
  }
}

// RESULTADO
Error: "Anchor witness_hash does not match document_entities.witness_hash"
// Evento NO se registra
```

### Error: Segundo anchor en mismo network

```typescript
// Estado actual: Ya existe anchor Polygon
events = [
  { "kind": "anchor", "anchor": { "network": "polygon", ... } }
]

// INTENTO
appendAnchorEvent(docId, {
  network: "polygon",  // ❌ Duplicado
  witness_hash: "...",
  txid: "0xOTRO"
})

// RESULTADO
// Silenciosamente ignorado (idempotente)
// NO falla, NO registra, retorna success
```

### Caso válido: Mismo anchor registrado dos veces (retry)

```typescript
// Primera llamada
appendAnchorEvent(docId, {
  network: "polygon",
  witness_hash: "ABC...",
  txid: "0x123"
})
// → Evento registrado

// Segunda llamada (retry por error de red)
appendAnchorEvent(docId, {
  network: "polygon",
  witness_hash: "ABC...",
  txid: "0x123"  // Mismo txid
})
// → Idempotente, no duplica, retorna success
```

---

## Apéndice C: Migración desde Legacy

### Estado Legacy (antes)

```sql
-- Tabla: anchors
id | document_hash | polygon_tx_hash | polygon_status | bitcoin_tx_id | ...

-- Tabla: anchor_states
project_id | polygon_confirmed_at | bitcoin_confirmed_at | ...
```

### Estado Canónico (después)

```sql
-- Tabla: document_entities
id | witness_hash | events | ...

-- events[] contiene:
[
  { "kind": "anchor", "anchor": { "network": "polygon", ... } },
  { "kind": "anchor", "anchor": { "network": "bitcoin", ... } }
]
```

### Estrategia de Migración

**Fase 1: Dual-write**
- Edge functions escriben a AMBOS:
  - `anchors` table (legacy)
  - `document_entities.events[]` (canónico)
- UI lee desde `events[]` con fallback a legacy

**Fase 2: Deprecación**
- Stop writes a `anchor_states`
- `anchors` queda como detalle operacional
- UI solo lee `events[]`

**Fase 3: (Opcional) Data migration**
- Migrar anchors históricos a `events[]`
- Archivar tablas legacy

---

**Fin del Contrato Canónico**
**Próxima revisión:** Al agregar nuevos networks (Ethereum, Solana, etc.)
**Mantenedor:** Equipo de Arquitectura Canónica
