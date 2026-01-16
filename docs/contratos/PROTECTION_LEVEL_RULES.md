# 📜 PROTECTION_LEVEL_RULES.md — CONTRATO CANÓNICO

**Versión:** v1.0
**Estado:** Canónico
**Scope:** Derivación de niveles probatorios
**Modelo:** Pure function / Event-driven
**Entidad raíz:** `document_entities.events[]`

---

## Objetivo

Definir de forma **determinística, monotónica y auditable** cómo se deriva el nivel probatorio de un documento exclusivamente a partir de `document_entities.events[]`.

Este contrato **NO introduce lógica nueva**, solo formaliza reglas ya implícitas en el sistema.

---

## 1. Principio Fundamental

**El nivel de protección NO es un estado persistido.**
**Es una derivación pura del ledger de eventos.**

- ❌ Nunca se guarda `protection_level` como truth
- ✅ Siempre se deriva desde `events[]`

---

## 2. Niveles Definidos (ENUM CERRADO)

```typescript
type ProtectionLevel =
  | 'NONE'
  | 'ACTIVE'
  | 'REINFORCED'
  | 'TOTAL';
```

**No se permiten** valores custom, strings libres ni extensiones sin contrato nuevo.

---

## 3. Definición Semántica de Cada Nivel

### 🟡 NONE

**Documento creado**

- Puede existir `witness_hash`
- **No hay TSA**
- No hay evidencia temporal externa
- Estado transitorio o documento recién generado

---

### 🟢 ACTIVE

**Condición mínima probatoria**

**Requisitos:**
- Existe al menos un evento TSA válido

```json
{
  "kind": "tsa",
  "witness_hash": "...",
  "tsa": { ... }
}
```

**Significado:**
- Existe evidencia temporal certificada
- El documento existía en un momento dado
- Autoridad de tiempo reconocida (RFC 3161)

---

### 🔵 REINFORCED

**Prueba distribuida**

**Requisitos:**
- `ACTIVE` ✅
- Existe al menos un anchor confirmado en **Polygon O Bitcoin** (el primero que confirme)

```json
{
  "kind": "anchor",
  "anchor": {
    "network": "polygon" | "bitcoin",
    "txid": "...",
    "confirmed_at": "2026-01-06T..."
  }
}
```

**Significado:**
- Evidencia temporal + registro público distribuido
- Independencia de una sola autoridad
- Alta resistencia a disputas
- Plan FREE usa Bitcoin (más lento, mismo valor probatorio)
- Plan PRO usa Polygon (más rápido) + Bitcoin (máximo)

---

### 🟣 TOTAL

**Prueba máxima**

**Requisitos:**
- `REINFORCED` ✅
- Existen anchors confirmados en **AMBAS redes: Polygon Y Bitcoin**

```json
{
  "kind": "anchor",
  "anchor": {
    "network": "bitcoin",
    "txid": "...",
    "confirmed_at": "2026-01-06T..."
  }
}
```

**Significado:**
- Anclaje en la red más resistente conocida
- Inmutabilidad práctica
- Máximo peso probatorio razonable hoy

---

## 4. Regla de Monotonía (CRÍTICA)

> **El nivel de protección SOLO puede subir.**
> **Nunca puede bajar.**

Formalmente:

```typescript
nextLevel >= currentLevel
```

**Consecuencias:**
- ✅ Fallas de anchors NO degradan el nivel
- ✅ Reintentos no afectan UI
- ✅ No hay estados "pending" que resten valor

---

## 5. Algoritmo Canónico de Derivación

```typescript
function deriveProtectionLevel(events: Event[]): ProtectionLevel {
  const hasTsa = events.some(e => e.kind === 'tsa');

  const hasPolygon = events.some(
    e => e.kind === 'anchor' &&
         e.anchor.network === 'polygon' &&
         e.anchor.confirmed_at !== undefined
  );

  const hasBitcoin = events.some(
    e => e.kind === 'anchor' &&
         e.anchor.network === 'bitcoin' &&
         e.anchor.confirmed_at !== undefined
  );

  // TOTAL: TSA + both anchors
  if (hasBitcoin && hasPolygon && hasTsa) return 'TOTAL';
  // REINFORCED: TSA + first anchor (either one)
  if ((hasPolygon || hasBitcoin) && hasTsa) return 'REINFORCED';
  // ACTIVE: TSA only
  if (hasTsa) return 'ACTIVE';
  return 'NONE';
}
```

⚠️ **Este código es referencia canónica**
Cualquier implementación debe ser equivalente.

---

## 6. Relación con la UI

**La UI:**

❌ NO interpreta estados legacy
❌ NO infiere por timestamps
❌ NO usa flags booleanos

**La UI:**

✅ Lee `events[]`
✅ Aplica `deriveProtectionLevel()`
✅ Muestra badges / colores / copy

---

## 7. Casos Edge Documentados

| Escenario | Nivel | Motivo |
|-----------|-------|--------|
| TSA válido, anchors fallidos | `ACTIVE` | TSA es suficiente |
| Polygon confirmado, no Bitcoin | `REINFORCED` | Primer anchor cuenta |
| Bitcoin confirmado sin Polygon | `REINFORCED` | Primer anchor cuenta (Plan FREE) |
| Polygon + Bitcoin confirmados | `TOTAL` | Ambos anchors = máximo |
| Múltiples TSA | `ACTIVE` | Idempotente |
| Re-anchor mismo network | Sin cambio | Unicidad garantizada |

---

## 8. Compatibilidad Legacy

Mientras exista legacy:

- `anchor_states` = fuente secundaria
- `events[]` = **fuente primaria**
- UI **SIEMPRE** prioriza `events[]`

**Legacy nunca puede subir nivel si `events[]` no lo refleja.**

---

## 9. Prohibiciones Explícitas

- ❌ Guardar `protection_level` en DB
- ❌ Estados tipo `"PARTIAL"`, `"PENDING"`
- ❌ Downgrade automático
- ❌ Inferir nivel por timestamps
- ❌ Basarse en success/failure de workers

---

## 10. Garantía del Sistema

> **Si `events[]` es íntegro,**
> **el nivel de protección es reproducible, explicable y defendible**
> **hoy y dentro de 20 años.**

---

## 11. Nota Filosófica

> **El documento no es fuerte porque esté en Bitcoin.**
> **Está en Bitcoin porque ya era verdadero.**

---

## Apéndice A: Ejemplos Completos

### Ejemplo 1: Progresión Normal

```json
// t=0: Documento creado
{
  "events": []
}
// → NONE

// t=1: TSA obtenido
{
  "events": [
    { "kind": "tsa", "witness_hash": "abc...", "tsa": {...} }
  ]
}
// → ACTIVE

// t=2: Polygon confirmado
{
  "events": [
    { "kind": "tsa", ... },
    { "kind": "anchor", "anchor": { "network": "polygon", ... } }
  ]
}
// → REINFORCED

// t=3: Bitcoin confirmado
{
  "events": [
    { "kind": "tsa", ... },
    { "kind": "anchor", "anchor": { "network": "polygon", ... } },
    { "kind": "anchor", "anchor": { "network": "bitcoin", ... } }
  ]
}
// → TOTAL
```

---

### Ejemplo 2: Solo Bitcoin (Plan FREE)

```json
{
  "events": [
    { "kind": "tsa", ... },
    { "kind": "anchor", "anchor": { "network": "bitcoin", ... } }
  ]
}
// → REINFORCED
// Plan FREE usa solo TSA + Bitcoin
// Mismo valor probatorio, solo más lento
// No requiere Polygon para ser REINFORCED
```

---

### Ejemplo 3: TSA + Polygon, Bitcoin nunca confirma

```json
{
  "events": [
    { "kind": "tsa", ... },
    { "kind": "anchor", "anchor": { "network": "polygon", ... } }
  ]
}
// → REINFORCED
// Bitcoin falla o timeout → nivel NO baja
// Monotonía preservada
```

---

### Ejemplo 4: Múltiples intentos TSA (idempotencia)

```json
{
  "events": [
    { "kind": "tsa", "at": "2026-01-06T10:00:00Z", ... },
    { "kind": "tsa", "at": "2026-01-06T10:05:00Z", ... }
  ]
}
// → ACTIVE
// Múltiples TSA no cambian el nivel
// Solo el primero es significativo para derivación
```

---

## Apéndice B: Implementación en TypeScript

### Función de derivación completa

```typescript
export type ProtectionLevel = 'NONE' | 'ACTIVE' | 'REINFORCED' | 'TOTAL';

export interface Event {
  kind: string;
  at: string;
  [key: string]: unknown;
}

export interface TsaEvent extends Event {
  kind: 'tsa';
  witness_hash: string;
  tsa: {
    token_b64: string;
    gen_time?: string;
  };
}

export interface AnchorEvent extends Event {
  kind: 'anchor';
  anchor: {
    network: 'polygon' | 'bitcoin';
    witness_hash: string;
    txid: string;
    block_height?: number;
    confirmed_at: string;
  };
}

/**
 * Derive protection level from events (canonical implementation)
 *
 * Contract: docs/contratos/PROTECTION_LEVEL_RULES.md
 *
 * Rules:
 * - NONE: No TSA
 * - ACTIVE: Has TSA
 * - REINFORCED: Has TSA + first anchor (Polygon OR Bitcoin)
 * - TOTAL: Has TSA + Polygon anchor + Bitcoin anchor (both)
 *
 * Monotonic: Level can only increase, never decrease
 */
export function deriveProtectionLevel(events: Event[]): ProtectionLevel {
  if (!Array.isArray(events) || events.length === 0) {
    return 'NONE';
  }

  // Check for TSA event
  const hasTsa = events.some((e): e is TsaEvent =>
    e.kind === 'tsa' &&
    typeof e.witness_hash === 'string' &&
    typeof e.tsa?.token_b64 === 'string'
  );

  // Check for confirmed Polygon anchor
  const hasPolygon = events.some((e): e is AnchorEvent =>
    e.kind === 'anchor' &&
    e.anchor?.network === 'polygon' &&
    typeof e.anchor?.confirmed_at === 'string'
  );

  // Check for confirmed Bitcoin anchor
  const hasBitcoin = events.some((e): e is AnchorEvent =>
    e.kind === 'anchor' &&
    e.anchor?.network === 'bitcoin' &&
    typeof e.anchor?.confirmed_at === 'string'
  );

  // Apply derivation rules (order matters for correctness)
  // TOTAL: TSA + both anchors
  if (hasBitcoin && hasPolygon && hasTsa) return 'TOTAL';
  // REINFORCED: TSA + first anchor (either one)
  if ((hasPolygon || hasBitcoin) && hasTsa) return 'REINFORCED';
  // ACTIVE: TSA only
  if (hasTsa) return 'ACTIVE';
  return 'NONE';
}

/**
 * Get human-readable label for protection level
 */
export function getProtectionLevelLabel(level: ProtectionLevel): string {
  const labels: Record<ProtectionLevel, string> = {
    NONE: 'Sin protección',
    ACTIVE: 'Protección activa',
    REINFORCED: 'Protección reforzada',
    TOTAL: 'Protección total',
  };
  return labels[level];
}

/**
 * Get UI color for protection level
 */
export function getProtectionLevelColor(level: ProtectionLevel): string {
  const colors: Record<ProtectionLevel, string> = {
    NONE: 'gray',
    ACTIVE: 'green',
    REINFORCED: 'blue',
    TOTAL: 'purple',
  };
  return colors[level];
}
```

---

### Uso en UI Component

```typescript
import { deriveProtectionLevel } from './protectionLevel';

function DocumentCard({ document }: { document: DocumentEntity }) {
  const level = deriveProtectionLevel(document.events || []);
  const label = getProtectionLevelLabel(level);
  const color = getProtectionLevelColor(level);

  return (
    <div>
      <Badge color={color}>{label}</Badge>
      {/* ... */}
    </div>
  );
}
```

---

## Apéndice C: SQL Implementation (PostgreSQL)

### Función en base de datos

```sql
CREATE OR REPLACE FUNCTION derive_protection_level(events JSONB)
RETURNS TEXT AS $$
DECLARE
  has_tsa BOOLEAN;
  has_polygon BOOLEAN;
  has_bitcoin BOOLEAN;
BEGIN
  -- Check for TSA event
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(events) e
    WHERE e->>'kind' = 'tsa'
      AND e->>'witness_hash' IS NOT NULL
      AND e->'tsa'->>'token_b64' IS NOT NULL
  ) INTO has_tsa;

  -- Check for Polygon anchor
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(events) e
    WHERE e->>'kind' = 'anchor'
      AND e->'anchor'->>'network' = 'polygon'
      AND e->'anchor'->>'confirmed_at' IS NOT NULL
  ) INTO has_polygon;

  -- Check for Bitcoin anchor
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(events) e
    WHERE e->>'kind' = 'anchor'
      AND e->'anchor'->>'network' = 'bitcoin'
      AND e->'anchor'->>'confirmed_at' IS NOT NULL
  ) INTO has_bitcoin;

  -- Apply derivation rules
  -- TOTAL: TSA + both anchors
  IF has_bitcoin AND has_polygon AND has_tsa THEN
    RETURN 'TOTAL';
  -- REINFORCED: TSA + first anchor (either one)
  ELSIF (has_polygon OR has_bitcoin) AND has_tsa THEN
    RETURN 'REINFORCED';
  -- ACTIVE: TSA only
  ELSIF has_tsa THEN
    RETURN 'ACTIVE';
  ELSE
    RETURN 'NONE';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Uso en query

```sql
SELECT
  id,
  witness_hash,
  derive_protection_level(events) as protection_level,
  events
FROM document_entities
WHERE user_id = 'abc-123';
```

---

## Apéndice D: Migración desde Legacy

### Estado Legacy (antes)

```sql
-- Columnas legacy en user_documents
protection_level TEXT,  -- ❌ Stored state
polygon_status TEXT,    -- ❌ Worker status
bitcoin_status TEXT     -- ❌ Worker status
```

### Estado Canónico (después)

```sql
-- Solo events[] en document_entities
events JSONB NOT NULL DEFAULT '[]'::jsonb

-- Protection level derivado on-the-fly
-- NO se almacena como columna
```

### Estrategia de migración

**Fase 1: Dual-source (NOW)**
```typescript
function getProtectionLevel(doc: Document): ProtectionLevel {
  // Prefer canonical
  if (doc.events && doc.events.length > 0) {
    return deriveProtectionLevel(doc.events);
  }

  // Fallback to legacy
  return doc.protection_level || 'NONE';
}
```

**Fase 2: Canonical-only (LATER)**
```typescript
function getProtectionLevel(doc: Document): ProtectionLevel {
  return deriveProtectionLevel(doc.events);
}
```

---

## Apéndice E: Validación y Testing

### Test Cases (Jest/Vitest)

```typescript
import { deriveProtectionLevel } from './protectionLevel';

describe('deriveProtectionLevel', () => {
  test('NONE: empty events', () => {
    expect(deriveProtectionLevel([])).toBe('NONE');
  });

  test('ACTIVE: TSA only', () => {
    const events = [
      { kind: 'tsa', witness_hash: 'abc', tsa: { token_b64: 'xyz' } }
    ];
    expect(deriveProtectionLevel(events)).toBe('ACTIVE');
  });

  test('REINFORCED: TSA + Polygon', () => {
    const events = [
      { kind: 'tsa', witness_hash: 'abc', tsa: { token_b64: 'xyz' } },
      { kind: 'anchor', anchor: { network: 'polygon', confirmed_at: '2026-01-06T...' } }
    ];
    expect(deriveProtectionLevel(events)).toBe('REINFORCED');
  });

  test('TOTAL: TSA + Polygon + Bitcoin', () => {
    const events = [
      { kind: 'tsa', witness_hash: 'abc', tsa: { token_b64: 'xyz' } },
      { kind: 'anchor', anchor: { network: 'polygon', confirmed_at: '...' } },
      { kind: 'anchor', anchor: { network: 'bitcoin', confirmed_at: '...' } }
    ];
    expect(deriveProtectionLevel(events)).toBe('TOTAL');
  });

  test('Monotonicity: Multiple TSA events still ACTIVE', () => {
    const events = [
      { kind: 'tsa', at: '2026-01-06T10:00:00Z', witness_hash: 'abc', tsa: { token_b64: 'x' } },
      { kind: 'tsa', at: '2026-01-06T10:05:00Z', witness_hash: 'abc', tsa: { token_b64: 'y' } }
    ];
    expect(deriveProtectionLevel(events)).toBe('ACTIVE');
  });

  test('REINFORCED: Bitcoin only (Plan FREE)', () => {
    const events = [
      { kind: 'tsa', witness_hash: 'abc', tsa: { token_b64: 'xyz' } },
      { kind: 'anchor', anchor: { network: 'bitcoin', confirmed_at: '...' } }
    ];
    // Plan FREE uses TSA + Bitcoin only
    // First anchor (either network) triggers REINFORCED
    expect(deriveProtectionLevel(events)).toBe('REINFORCED');
  });
});
```

---

**Fin del Contrato Canónico**
**Próxima revisión:** Al agregar nuevos niveles o cambiar semántica
**Mantenedor:** Equipo de Arquitectura Canónica
