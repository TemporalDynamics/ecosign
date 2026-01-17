# TSA Event Rules (Time-Stamp Authority)

**Versión:** 1.0  
**Estado:** NORMATIVO  
**Fecha:** 2026-01-06

## 1. Propósito

Este documento define las reglas canónicas para eventos de tipo `tsa` en el ledger `document_entities.events[]`.

Un evento TSA registra evidencia temporal criptográfica (RFC 3161) sobre el hash canónico del documento testigo.

**Principio fundamental:**
> TSA es evidencia histórica, no estado mutable.  
> `events[]` es el único ledger. `tsa_latest` es cache derivado.

---

## 2. Estructura del Evento TSA

Un evento TSA **DEBE** tener esta estructura:

```jsonb
{
  "kind": "tsa",
  "at": "2026-01-06T15:30:00.000Z",
  "witness_hash": "abc123...",
  "tsa": {
    "token_b64": "MII...",
    "gen_time": "2026-01-06T15:30:00Z",
    "policy_oid": "1.2.3.4.5",
    "serial": "123456",
    "digest_algo": "sha256",
    "tsa_cert_fingerprint": "def456...",
    "token_hash": "xyz789..."
  }
}
```

---

## 3. Invariantes (MUST)

### 3.1. Campos Obligatorios

| Campo | Tipo | Regla |
|-------|------|-------|
| `kind` | `string` | MUST be `"tsa"` |
| `at` | `ISO 8601` | MUST be valid timestamp (when event was appended) |
| `witness_hash` | `hex string` | MUST match `document_entities.witness_hash` |
| `tsa.token_b64` | `base64` | MUST be valid RFC 3161 TimeStampToken (DER) |

**Enforcement:** DB trigger `enforce_events_append_only()` validates on INSERT/UPDATE.

### 3.2. Append-Only Invariant

```sql
events[] CANNOT shrink
events[] CANNOT be mutated at index i < last_index
events[] CAN ONLY be appended: events || new_event
```

**Enforcement:** DB trigger `enforce_events_append_only()`.

### 3.3. Hash Consistency

```sql
event.witness_hash MUST EQUAL document_entities.witness_hash
```

**Rationale:**  
Prevents "correct hash in wrong context" errors.  
TSA **MUST** timestamp the canonical witness, not the source.

**Enforcement:** DB trigger validation.

---

## 4. Recomendaciones (SHOULD)

### 4.1. Campos Recomendados

| Campo | Descripción |
|-------|-------------|
| `tsa.gen_time` | Timestamp del token TSA (RFC 3161) |
| `tsa.policy_oid` | OID de la política TSA |
| `tsa.serial` | Serial number del token |
| `tsa.digest_algo` | Algoritmo de hash usado (ej: `sha256`) |

**Nota:** No son obligatorios (MUST) porque algunos tokens TSA pueden no exponerlos.

### 4.2. Campos Opcionales (MAY)

| Campo | Uso |
|-------|-----|
| `tsa.tsa_cert_fingerprint` | Fingerprint del certificado TSA (para auditoría) |
| `tsa.token_hash` | Hash del token completo (para deduplicación) |

---

## 5. Cache Derivado: `tsa_latest`

```sql
tsa_latest = last(events where kind = "tsa")
```

**Propiedades:**
- **Derivable:** Se calcula automáticamente via trigger `update_tsa_latest()`.
- **NO es fuente de verdad:** Si hay conflicto, `events[]` gana.
- **Read model:** Usado para UI/proyecciones (evita escanear `events[]`).

**Regla:**
```
tsa_latest MUST be null OR equal to last TSA event in events[]
```

---

## 6. Múltiples TSA (Permitido)

Un documento **PUEDE** tener múltiples eventos TSA:

- Reintentos (TSA falló, se reintenta con otra TSA)
- TSA alternativas (Polygon + Bitcoin tienen TSA independientes)
- Renovación temporal (TSA expiró, se solicita nueva)

**Regla:**
```
events[] = [
  { kind: "tsa", at: "2026-01-06T15:00:00Z", tsa: {...} },
  { kind: "tsa", at: "2026-01-06T16:00:00Z", tsa: {...} }  // válido
]
```

`tsa_latest` siempre apunta al **más reciente** (por `at`).

---

## 7. Proyección ECO v2
TSA alimenta el ECOX y habilita snapshots ECO; no cierra la historia.

El formato `.eco v2` **DEBE** incluir TSA si existe:

```jsonb
{
  "version": "eco.v2",
  "hash_chain": { ... },
  "events": [
    {
      "kind": "tsa",
      "at": "...",
      "witness_hash": "...",
      "tsa": { "token_b64": "...", ... }
    }
  ]
}
```

**Regla:**
- Si `events[]` tiene eventos TSA → `eco.events` MUST incluirlos.
- Si `events[]` está vacío → `eco.events` es `[]` (no error).

---

## 8. Verificación (Verifier v2)

### 8.1. Estados TSA

| Estado | Condición |
|--------|-----------|
| `valid` | Token presente + parseable + `witness_hash` match |
| `incomplete` | No hay TSA (pero no es error: depende de policy) |
| `unknown` | Token presente pero no verificable offline |
| `tampered` | Token presente pero `witness_hash` inconsistente |

### 8.2. Verificación Offline

El verificador **DEBE**:

1. Leer `events[]` (o `tsa_latest`)
2. Parsear `tsa.token_b64` (RFC 3161)
3. Verificar que `hashed_message` en token == `witness_hash`
4. (Opcional) Verificar firma del certificado TSA

**No requiere backend:** toda evidencia está en `.eco`.

---

## 9. Service Layer

### 9.1. Interfaz

```typescript
async function appendTsaEvent(
  entityId: string,
  tsaPayload: {
    token_b64: string;
    witness_hash: string;
    gen_time?: string;
    policy_oid?: string;
    serial?: string;
    digest_algo?: string;
    tsa_cert_fingerprint?: string;
    token_hash?: string;
  }
): Promise<void>
```

### 9.2. Reglas de Implementación

1. **Validar witness_hash:**
   ```typescript
   const entity = await fetchEntity(entityId);
   if (tsaPayload.witness_hash !== entity.witness_hash) {
     throw new Error("TSA witness_hash mismatch");
   }
   ```

2. **Construir evento:**
   ```typescript
   const event = {
     kind: "tsa",
     at: new Date().toISOString(),
     witness_hash: tsaPayload.witness_hash,
     tsa: {
       token_b64: tsaPayload.token_b64,
       gen_time: tsaPayload.gen_time,
       policy_oid: tsaPayload.policy_oid,
       serial: tsaPayload.serial,
       digest_algo: tsaPayload.digest_algo || "sha256",
       tsa_cert_fingerprint: tsaPayload.tsa_cert_fingerprint,
       token_hash: tsaPayload.token_hash
     }
   };
   ```

3. **Append via SQL:**
   ```sql
   UPDATE document_entities
   SET events = events || jsonb_build_array($1::jsonb)
   WHERE id = $2
   ```

**NO usar:**
- `INSERT` (TSA no crea entidades)
- Mutación de `events[i]` existente
- Escritura directa a `tsa_latest` (auto-managed)

---

## 10. UI Guidelines

La UI **DEBE** reflejar evidencia presente, no prometer TSA:

❌ **Evitar:**
- "Este documento está protegido legalmente"
- "Timestamp garantizado"

✅ **Usar:**
- "Timestamp TSA presente" (si existe)
- "Sin timestamp TSA" (si no existe)
- "Timestamp: 2026-01-06 15:30:00 UTC (FreeTSA)"

**Principio:**
> UI describe, no afirma.

---

## 11. Ejemplo Completo

### 11.1. Flujo de Creación

1. Usuario sube documento → `source_hash` generado
2. Sistema genera witness PDF → `witness_hash` generado
3. Sistema solicita TSA:
   ```typescript
   const tsa = await requestLegalTimestamp(witness_hash);
   await appendTsaEvent(entityId, {
     token_b64: tsa.token,
     witness_hash: witness_hash,
     gen_time: tsa.timestamp,
     policy_oid: tsa.policy,
     serial: tsa.serialNumber,
     digest_algo: "sha256"
   });
   ```

### 11.2. Estado DB Resultante

```sql
SELECT id, witness_hash, events, tsa_latest
FROM document_entities
WHERE id = 'abc-123';
```

```jsonb
{
  "id": "abc-123",
  "witness_hash": "def456...",
  "events": [
    {
      "kind": "tsa",
      "at": "2026-01-06T15:30:00.000Z",
      "witness_hash": "def456...",
      "tsa": {
        "token_b64": "MII...",
        "gen_time": "2026-01-06T15:30:00Z",
        "policy_oid": "1.2.3.4.5",
        "serial": "123456",
        "digest_algo": "sha256"
      }
    }
  ],
  "tsa_latest": {
    "kind": "tsa",
    "at": "2026-01-06T15:30:00.000Z",
    "witness_hash": "def456...",
    "tsa": { "token_b64": "MII...", ... }
  }
}
```

---

## 12. Casos Edge

### 12.1. TSA antes de witness_hash

**Error esperado:**
```
TSA event witness_hash must match document_entities.witness_hash
```

**Solución:**
- Generar witness primero
- Luego solicitar TSA

### 12.2. Múltiples TSA simultáneos

**Válido:**
```jsonb
events: [
  { kind: "tsa", at: "...", tsa: { token_b64: "freeTSA..." } },
  { kind: "tsa", at: "...", tsa: { token_b64: "digicert..." } }
]
```

`tsa_latest` apunta al más reciente por `at`.

### 12.3. TSA token corrupto

**Validación:**
- DB acepta cualquier base64 (no parsea)
- Verifier v2 detecta corrupción → estado `unknown`

**Rationale:**
- DB no debe bloquear por errores de parseo
- Verificador decide validez, DB solo persiste

---

## 13. Migración desde Legacy

Si existen documentos con TSA en formato legacy (fuera de `events[]`):

1. **NO borrar datos legacy** (mantener `user_documents.tca_timestamp`)
2. **Migrar a `events[]`:**
   ```sql
   UPDATE document_entities
   SET events = events || jsonb_build_array(
     jsonb_build_object(
       'kind', 'tsa',
       'at', ud.tca_timestamp,
       'witness_hash', de.witness_hash,
       'tsa', jsonb_build_object(
         'token_b64', ud.tca_token,
         'gen_time', ud.tca_timestamp
       )
     )
   )
   FROM user_documents ud
   WHERE ud.id = document_entities.legacy_id
   AND ud.tca_token IS NOT NULL;
   ```

3. **Validar post-migración:**
   ```sql
   SELECT COUNT(*) FROM document_entities WHERE tsa_latest IS NOT NULL;
   ```

---

## 14. Referencias

- [RFC 3161](https://tools.ietf.org/html/rfc3161) - Time-Stamp Protocol (TSP)
- [RFC 2119](https://tools.ietf.org/html/rfc2119) - MUST/SHOULD/MAY keywords
- [docs/contratos/verdad-canonica.md](./verdad-canonica.md) - Canonical truth principles
- [docs/contratos/HASH_CHAIN_RULES.md](./HASH_CHAIN_RULES.md) - Hash chain invariants

---

**Resumen en una línea:**  
TSA es evidencia append-only en `events[]`, con `tsa_latest` como cache.  
`witness_hash` es la referencia canónica. UI refleja, no promete.
