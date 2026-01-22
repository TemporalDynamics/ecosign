# Contratos Canónicos - ALL IN ONE

**Versión:** v1.0  
**Fecha:** 2026-01-21  
**Estado:** CANÓNICO  
**Normas:** MUST, SHOULD, MAY (RFC 2119)

---

## Tabla de Contenidos

1. [Verdad Canónica](#verdad-canonica)
2. [Contrato ECO/ECOX](#contrato-ecoecox)
3. [Contrato de Entidad de Documento](#contrato-de-entidad-de-documento)
4. [Reglas de Cadena de Hashes](#reglas-de-cadena-de-hashes)
5. [Reglas de Eventos TSA](#reglas-de-eventos-tsa)
6. [Reglas de Eventos de Anclaje](#reglas-de-eventos-de-anclaje)
7. [Reglas de Niveles de Asistencia de Identidad](#reglas-de-niveles-de-asistencia-de-identidad)
8. [Reglas de Niveles de Protección](#reglas-de-niveles-de-protección)
9. [Contrato de Formato ECO](#contrato-de-formato-eco)
10. [Contrato de Formato ECO V2](#contrato-de-formato-eco-v2)
11. [Reglas de Autoridad y Causalidad](#reglas-de-autoridad-y-causalidad)
12. [Contrato de Autoridad del Sistema](#contrato-de-autoridad-del-sistema)
13. [Contrato de Modos de Flujo](#contrato-de-modos-de-flujo)
14. [Contrato de Testigo PDF](#contrato-de-testigo-pdf)
15. [Contrato de Esquema Mínimo ECO/ECOX](#contrato-de-esquema-mínimo-ecoecox)
16. [Contrato de Fase 1 Operativo](#contrato-de-fase-1-operativo)
17. [Reglas de Eventos Canónicos](#reglas-de-eventos-cánicos)
18. [Reglas de Autoridad del Executor](#reglas-de-autoridad-del-executor)
19. [Reglas de Orquestación de Flujos](#reglas-de-orquestación-de-flujos)
20. [Reglas de Protección Derivada](#reglas-de-protección-derivada)

---

## Verdad Canónica

**Referencia canónica:** `verdad-canonica.md` (Constitución)

### Jerarquía de Contratos

#### Nivel 0: Constitución
1. **`verdad-canonica.md`** — Verdad matemática, no legal

#### Nivel 1: Entidad y Ledger
2. **`DOCUMENT_ENTITY_CONTRACT.md`** — Entidad documental operativa
3. **`HASH_CHAIN_RULES.md`** — Cadena de hashes y witness_hash

#### Nivel 2: Eventos Probatorios
4. **`TSA_EVENT_RULES.md`** — Timestamping (RFC 3161)
5. **`ANCHOR_EVENT_RULES.md`** — Blockchain anchoring
6. **`IDENTITY_ASSURANCE_RULES.md`** ⭐ — Niveles de identidad (L0-L5)

#### Nivel 3: Protección y Certificación
7. **`PROTECTION_LEVEL_RULES.md`** — Derivación de niveles
8. **`ECO_FORMAT_CONTRACT.md`** — Formato de verificación
9. **`WITNESS_PDF_CONTRACT.md`** — Testigo visual PDF
10. **`CONTRATO_ECO_ECOX.md`** — Diferenciacion ECO vs ECOX
11. **`CONTRATO_LIFECYCLE_ECO_ECOX.md`** — Lifecycle ECO/ECOX (snapshots)
12. **`ECO_ECOX_MIN_SCHEMA.md`** — Esquema minimo ECO/ECOX
13. **`AUTORIDAD_DEL_SISTEMA.md`** — Autoridad canónica (write-path)

#### Nivel 4: Flujos y Experiencia
14. **`FLOW_MODES_CONTRACT.md`** — Modos de firma
15. **`IDENTITY_OTP_DECRYPTION_CONTRACT.md`** — Pre-acceso + OTP + decrypt
16. **`IMPACTO_TECNICO_MAPA.md`** — Mapa de impacto técnico
17. **`CONTRATO_AUTORIDAD_EJECUTOR.md`** — Autoridad unica del executor
18. **`CONTRATO_MAPEO_EJECUTOR.md`** — Mapeo CTA -> Intent -> Job
19. **`LISTA_IMPLEMENTACION_AUTORIDAD_EJECUTOR.md`** — Checklist minima de autoridad

### Principio Fundamental (Invariante Absoluto)

> **La verdad de un documento es su contenido original en un instante exacto del tiempo.**

Todo lo demas (PDF, firmas, flujos, blockchain, UI) son **derivados** o **testigos** de esa verdad.

Si el contenido original cambia, la verdad cambia.

---

## Contrato ECO/ECOX

**Referencia canonica:** VERDAD_CANONICA (docs/contratos/verdad-canonica.md)  
Version: v0.1  
Normas: MUST, SHOULD, MAY

### Invariante Principal

El archivo .ECO debe representar la cadena de hashes y transformaciones derivadas de un SourceTruth unico.

### Campos Minimos

El .ECO debe contener:

* `source.hash`
* `witness.hash` (si existe)
* `signed.hash` (si existe)
* `transform_log`
* `timestamps`
* `anchors`

### Reglas de Coherencia

* MUST: `version` es `eco.v1`.
* MUST: `document_id` existe.
* `source.hash` siempre existe.
* `witness.hash` solo existe si hay `VisualWitness`.
* `signed.hash` solo existe si hubo firma sobre el testigo.
* Cada item en `transform_log` debe enlazar hashes existentes en la cadena.

---

## Contrato de Entidad de Documento

**Referencia canonica:** VERDAD_CANONICA (docs/contratos/verdad-canonica.md)  
Version: v0.1  
Normas: MUST, SHOULD, MAY

### Entidad Canonica (`CanonicalDocument`)

Representa una unidad logica de verdad documental.

```ts
CanonicalDocument {
  id: UUID
  owner_id: UUID

  source: SourceTruth
  witness_current?: VisualWitness
  witness_history: VisualWitness[]

  hash_chain: HashChain
  transform_log: TransformLog[]

  custody_mode: 'hash_only' | 'encrypted_custody'
  lifecycle_status: LifecycleStatus

  created_at: Timestamp
  updated_at: Timestamp
}
```

### Verdad de Origen (`SourceTruth`)

La **base irrefutable** del sistema.

```ts
SourceTruth {
  name: string
  mime_type: string
  size_bytes: number

  hash: SHA256
  captured_at: Timestamp

  storage_path?: string // solo si custody_mode === 'encrypted_custody'
}
```

**Invariantes:**

* El `hash` se calcula sobre bytes exactos (SHA-256) **antes** de cualquier transformacion.
* El `hash` nunca cambia.
* Si el contenido cambia -> **no es el mismo documento**.
* `captured_at` es el instante de verdad, no el de upload.

---

## Reglas de Cadena de Hashes

**Referencia canonica:** VERDAD_CANONICA (docs/contratos/verdad-canonica.md)  
Version: v0.1  
Normas: MUST, SHOULD, MAY

### Cadena de Hashes (`HashChain`)

La cadena que vincula verdad -> testigos -> firmas.

```ts
HashChain {
  source_hash: SHA256
  witness_hash?: SHA256
  signed_hash?: SHA256

  composite_hash?: SHA256 // opcional (SmartHash)
}
```

**Invariantes:**

* Ningun hash puede existir sin su predecesor.
* La cadena es **append-only**.
* Romper un eslabon invalida todo lo posterior.

---

## Reglas de Eventos TSA

**Referencia canonica:** VERDAD_CANONICA (docs/contratos/verdad-canonica.md)  
Version: v0.1  
Normas: MUST, SHOULD, MAY

### Eventos TSA

Los eventos TSA deben incluir:
- `witness_hash` (referencia al testigo original)
- `token_b64` (token de sello de tiempo)
- `tsa_url` (servicio TSA utilizado)
- `algorithm` (algoritmo de hash)
- `standard` (RFC 3161)

### Reglas de Autoridad TSA

- El evento `tsa.confirmed` debe ser emitido solo después de recibir un token válido de un servicio TSA
- El `witness_hash` debe coincidir con el hash del testigo en `document_entities`
- El token debe ser verificable contra el servicio TSA

---

## Reglas de Eventos de Anclaje

**Referencia canonica:** VERDAD_CANONICA (docs/contratos/verdad-canonica.md)  
Version: v0.1  
Normas: MUST, SHOULD, MAY

### Evento Canónico de Confirmación

#### Evento: `anchor`

**Estructura:**
```json
{
  "kind": "anchor",
  "at": "timestamp",
  "anchor": {
    "network": "polygon" | "bitcoin",
    "witness_hash": "string",
    "txid": "string",
    "block_height": "number",
    "confirmed_at": "timestamp"
  }
}
```

**Semántica:**
- Representa **confirmación exitosa** de un anclaje en blockchain
- No es solicitud (`anchor.submitted`) ni falla (`anchor.failed`)
- Es el evento que confirma que el anclaje está en la blockchain

**Regla canónica:**
Durante la fase actual, el evento `anchor` representa semánticamente
un `anchor.confirmed` si y solo si incluye:
- `payload.network`
- `payload.confirmed_at`

### Eventos Relacionados

#### `anchor.submitted`
- **Propósito:** Indica solicitud de anclaje
- **Estructura:** 
```json
{
  "kind": "anchor.submitted",
  "at": "timestamp",
  "payload": {
    "network": "polygon" | "bitcoin"  // Solo después del fix
  }
}
```

#### `anchor.failed`
- **Propósito:** Indica fallo permanente de anclaje
- **Estructura:**
```json
{
  "kind": "anchor.failed", 
  "at": "timestamp",
  "payload": {
    "network": "polygon" | "bitcoin",
    "reason": "string",
    "retryable": "boolean"
  }
}
```

---

## Reglas de Niveles de Asistencia de Identidad

**Referencia canonica:** VERDAD_CANONICA (docs/contratos/verdad-canonica.md)  
Version: v0.1  
Normas: MUST, SHOULD, MAY

### Principio Fundamental

**La identidad no es un binario. Es un continuo de certeza probatoria.**

### Modelo de Niveles de Identidad (CERRADO)

#### 3.1 Niveles Definidos

| Nivel | Método | Costo | Fricción | Uso típico | Estado Implementación |
|-------|--------|-------|----------|------------|----------------------|
| **L0** | Acknowledgement explícito | $0 | Ninguna | Acuerdos simples | ✅ CERRADO |
| **L1** | Magic Link (Email) | $0 | Baja | NDAs, aprobaciones | ✅ CERRADO |
| **L2** | OTP SMS / Voice | Bajo | Media | Flujos comerciales | 🔄 PRÓXIMO |
| **L3** | Passkey (WebAuthn) | $0 | Muy baja | Usuarios frecuentes | 🔄 PRÓXIMO |
| **L4** | Biométrico + ID | Alto | Alta | Inmobiliario, crédito | 🔮 FUTURO |
| **L5** | Certificado (QES / e.firma) | Alto | Alta | Escrituras, fiscal | 🔮 FUTURO |

### Reglas de Registro Canónico

Toda acción de identidad genera un evento append-only en `document_entities.events[]`:

```json
{
  "kind": "identity",
  "at": "2026-01-07T10:00:00Z",
  "level": "L0 | L1 | L2 | L3 | L4 | L5",
  "method": "email_magic_link | sms_otp | passkey | biometric | certificate",
  "email": "user@example.com",
  "metadata": {
    "device_fingerprint": "sha256(...)",
    "user_agent": "Mozilla/5.0...",
    "ip_address": "...",
    "passkey_credential_id": "...",
    "provider": "ecosign | mifiel | onfido"
  }
}
```

### Invariantes INMUTABLES

Los eventos de identidad:
- ✅ Son append-only (NUNCA se borran)
- ✅ Forman parte del ledger probatorio
- ✅ Son reproducibles en el tiempo
- ✅ Se registran ANTES de la firma
- ❌ NUNCA se degradan
- ❌ NUNCA se reescriben

---

## Reglas de Niveles de Protección

**Referencia canonica:** VERDAD_CANONICA (docs/contratos/verdad-canonica.md)  
Version: v0.1  
Normas: MUST, SHOULD, MAY

### Niveles de Evidencia Basados en Eventos

#### `PROTECTED`: 
- Requiere: `tsa.confirmed`

#### `REINFORCED`:
- Requiere: `tsa.confirmed` + al menos 1 evento `anchor` (cualquier red)

#### `MAXIMUM`:
- Requiere: `tsa.confirmed` + evento `anchor` para Polygon + evento `anchor` para Bitcoin

### Reglas de Validación

1. **Unicidad por red:** Máximo 1 evento `anchor` por red por documento
2. **Monotonicidad:** Nivel de protección solo puede aumentar
3. **Idempotencia:** Mismo `txid` en misma red = no duplicar evento
4. **Verificabilidad:** Todo dato debe ser verificable contra blockchain

---

## Contrato de Formato ECO

**Referencia canonica:** VERDAD_CANONICA (docs/contratos/verdad-canonica.md)  
Version: v0.1  
Normas: MUST, SHOULD, MAY

### Esquema Canonico (payload minimo)

```ts
ECOv1 {
  version: 'eco.v1'
  document_id: UUID
  source: {
    hash: SHA256
    mime: string
    name?: string
    captured_at: Timestamp
  }
  witness?: {
    hash: SHA256
    mime: 'application/pdf'
    generated_at: Timestamp
  }
  signed?: {
    hash: SHA256
    signed_at: Timestamp
  }
  transform_log: TransformLog[]
  timestamps: {
    created_at: Timestamp
    tca?: RFC3161
  }
  anchors: {
    polygon?: Anchor
    bitcoin?: Anchor
  }
}

Anchor {
  network: 'polygon' | 'bitcoin'
  txid: string
  anchored_at: Timestamp
  status: 'pending' | 'confirmed' | 'failed'
}
```

---

## Contrato de Formato ECO V2

**Referencia canonica:** VERDAD_CANONICA (docs/contratos/verdad-canonica.md)  
Version: v0.1  
Normas: MUST, SHOULD, MAY

### Esquema canonico (payload minimo)

```ts
ECOv2 {
  version: 'eco.v2'
  document_entity_id: UUID

  source: {
    hash: SHA256
    mime: string
    name?: string
    size_bytes: number
    captured_at: Timestamp
  }

  witness?: {
    hash: SHA256
    mime: 'application/pdf'
    generated_at: Timestamp
    status: 'generated' | 'signed'
  }

  signed?: {
    hash: SHA256
    signed_at: Timestamp
    authority?: 'internal' | 'external'
    authority_ref?: {
      id?: string
      type?: string
      jurisdiction?: string
    }
  }

  hash_chain: {
    source_hash: SHA256
    witness_hash?: SHA256
    signed_hash?: SHA256
    composite_hash?: SHA256
  }

  transform_log: TransformLog[]

  timestamps: {
    created_at: Timestamp
    tca?: RFC3161
  }

  anchors: {
    polygon?: Anchor
    bitcoin?: Anchor
    rfc3161?: AnchorRFC3161
  }
}
```

---

## Reglas de Autoridad y Causalidad

**Referencia canonica:** AUTHORITY_AND_CAUSALITY_RULES.md  
Version: v1.0  
Estado: Activo (Fase 1/2)

### Regla de autoridad (no negociable)

Si una accion probatoria no pasa por el executor, NO ocurre.

Traduccion operativa:
- El executor es el unico juez de causalidad.
- Los workers ejecutan tareas tecnicas; no deciden flujo.
- El cliente NUNCA ejecuta TSA ni anchoring.
- La base de datos NO ejecuta evidencia (solo encola o registra).

### Eventos ECO vs ECOX

La evidencia publica (ECO) es un subconjunto curado de la evidencia tecnica (ECOX).

#### ECO (hechos probatorios)
- `document.signed`
- `tsa.confirmed`
- `anchor.confirmed`
- `artifact.finalized`

#### ECOX (operativo/tecnico)
- `document.protected.requested`
- `tsa.failed`
- `anchor.submitted`
- `anchor.failed`
- `artifact.failed`

---

## Contrato de Autoridad del Sistema

**Referencia canonica:** AUTORIDAD_DEL_SISTEMA.md  
Version: v1.0  
Estado: CANÓNICO

### Principio de Autoridad

La autoridad del sistema reside en el executor, no en los workers ni en la base de datos directamente.

### Reglas de Autoridad

- El executor es el único que puede encolar jobs
- Los workers solo ejecutan tareas técnicas
- Todos los eventos deben pasar por validación de autoridad
- La verdad canónica vive en `document_entities.events[]`

---

## Contrato de Modos de Flujo

**Referencia canonica:** FLOW_MODES_CONTRACT.md  
Version: v0.1  
Estado: CANÓNICO

### Modos de Firma

- **Modo Secuencial:** Firmantes firman en orden
- **Modo Paralelo:** Todos los firmantes pueden firmar simultáneamente
- **Modo Condicionado:** Firma depende de condiciones externas

---

## Contrato de Testigo PDF

**Referencia canonica:** WITNESS_PDF_CONTRACT.md  
Version: v0.1  
Estado: CANÓNICO

### Testigo Visual (`VisualWitness`)

Representa una **derivacion visual humana** del documento (normalmente PDF).

No es la verdad. Es un **testigo**.

```ts
VisualWitness {
  mime_type: 'application/pdf'
  hash: SHA256

  storage_path: string
  status: 'generated' | 'signed'

  generated_at: Timestamp
}
```

**Reglas:**

* Un `VisualWitness` siempre deriva de un `SourceTruth`.
* Su hash es distinto al hash de origen.
* Puede haber multiples testigos a lo largo del tiempo (witness_history).
* Si existe `witness_current`, debe ser el ultimo testigo de `witness_history`.
* MUST: `witness_current.hash === hash_chain.witness_hash` cuando exista.

---

## Contrato de Esquema Mínimo ECO/ECOX

**Referencia canonica:** ECO_ECOX_MIN_SCHEMA.md  
Version: v0.1  
Estado: CANÓNICO

### Esquema Mínimo

Define el conjunto mínimo de campos requeridos para que un archivo .ECO/.ECOX sea considerado válido.

---

## Contrato de Fase 1 Operativo

**Referencia canonica:** FASE_1_CONTRATO_OPERATIVO.md  
Version: v1.0  
Estado: CANÓNICO

### Autoridad

- La autoridad de ejecucion es el Executor.
- Triggers, crons y edge functions directas no tienen autoridad.
- Los contratos declaran reglas, el Executor decide timing y ejecucion.

### Eventos canonicos (Fase 1)

Convencion: `kind + at + payload` (ver DECISION_EVENT_CONVENTION_FASE1).

Eventos minimos:
- document.created
- tsa.appended
- anchor.confirmed
- anchor.failed
- workflow.artifact_finalized

Notas:
- `anchor.confirmed` incluye `payload.network`.
- `anchor.failed` incluye `payload.reason` y `payload.retryable`.

---

## Reglas de Eventos Canónicos

**Referencia canonica:** CANONICAL_EVENTS_LIST.md  
Version: v1.0  
Estado: CANÓNICO

### Eventos Canónicos

Lista de eventos que forman parte del ledger probatorio:

- `document.created`
- `document.signed`
- `tsa.confirmed`
- `tsa.failed`
- `anchor.submitted`
- `anchor.confirmed`
- `anchor.failed`
- `artifact.finalized`
- `artifact.failed`

---

## Reglas de Autoridad del Executor

**Referencia canonica:** CONTRATO_AUTORIDAD_EJECUTOR.md  
Version: v1.0  
Estado: CANÓNICO

### Autoridad del Executor

- El executor es el único juez de causalidad
- Decide qué jobs se encolan basado en eventos canónicos
- No inventa estado, solo lee `document_entities.events[]`
- Todos los jobs pasan por validación de autoridad

---

## Reglas de Orquestación de Flujos

**Referencia canonica:** CONTRATO_ORQUESTACION_FLUJOS.md  
Version: v1.0  
Estado: CANÓNICO

### Orquestación

- El orquestador decide qué jobs se deben encolar
- Lee eventos canónicos para tomar decisiones
- No ejecuta tareas, solo coordina workers
- Mantiene consistencia entre estado y acciones

---

## Reglas de Protección Derivada

**Referencia canonica:** CONTRATO_PROTECCION_DERIVADA.md  
Version: v1.0  
Estado: CANÓNICO

### Derivación de Protección

- El nivel de protección se deriva de eventos existentes
- No se almacena estado de protección, se calcula
- La derivación es determinística y reproducible
- El cálculo se basa únicamente en `document_entities.events[]`

---

## Conclusión

Este documento combina todos los contratos canónicos del sistema Ecosign en un solo archivo para facilitar la comprensión y el acceso. Cada contrato mantiene su integridad original pero ahora están disponibles en un único punto de referencia.

**Importante:** Este documento es una compilación de los contratos originales. Para cambios oficiales, deben modificarse los archivos individuales en `/docs/contratos/`.

---

## Anexo: Información Complementaria Importante

### Arquitectura del Sistema

#### Visión General

EcoSign es una aplicación JAMStack para la protección y evidencia técnica de documentos digitales con capacidades de registro en blockchain (Polygon y Bitcoin).

#### Componentes Principales

1. **Cliente (`/client`)**: SPA React/Vite con interfaz de usuario
2. **Backend (`/supabase`)**: BaaS con auth, DB, storage, functions
3. **Librería compartida (`/eco-packer`)**: Lógica de negocio y formato .ECO/.ECOX
4. **Contratos inteligentes (`/contracts`)**: Anclaje en Polygon
5. **Documentación (`/docs`)**: Documentación técnica y decisiones de arquitectura

### Decisiones Arquitectónicas Clave

#### Sistema de Autoridad

**Principio:** El executor es el único juez de causalidad. Todos los eventos pasan por validación de autoridad.

**Reglas:**
- El executor decide qué jobs se encolan basado en eventos canónicos
- Los workers solo ejecutan tareas técnicas
- Todos los eventos deben pasar por validación de autoridad
- La verdad canónica vive en `document_entities.events[]`

#### Eventos Append-Only

**Principio:** Los eventos son inmutables y solo se agregan. El estado se deriva de eventos, no se almacena.

**Implementación:**
- Trigger de base de datos que impide modificaciones a `events[]`
- Validación de estructura de eventos en `appendEvent()`
- Validación de autoridad de emisor en `appendEvent()`

#### Validación de Autoridad

**Principio:** Solo funciones autorizadas pueden emitir eventos de evidencia fuerte.

**Implementación:**
- Allowlist de fuentes autorizadas por tipo de evento
- Validación de `_source` para eventos de evidencia fuerte
- Validación de causalidad temporal para eventos de confirmación

### Flujo de Anclaje

#### Anclaje en Polygon

**Flujo:**
1. `submit-anchor-polygon` recibe solicitud
2. Emite `anchor.submitted` con `payload.network = 'polygon'`
3. `process-polygon-anchors` confirma transacción en blockchain
4. Emite `anchor` con `payload.network = 'polygon'` y `payload.confirmed_at`

#### Anclaje en Bitcoin

**Flujo:**
1. `submit-anchor-bitcoin` recibe solicitud
2. Emite `anchor.submitted` con `payload.network = 'bitcoin'`
3. `process-bitcoin-anchors` confirma OpenTimestamps
4. Emite `anchor` con `payload.network = 'bitcoin'` y `payload.confirmed_at`

#### Validación de Confirmación

**Regla:** Un anclaje está confirmado si y solo si:
- Tiene `kind = 'anchor'` (o `anchor.confirmed`)
- Tiene `payload.network` (polygon o bitcoin)
- Tiene `payload.confirmed_at`
- `payload.confirmed_at ≥ event.at` (causalidad temporal)

### Seguridad y Buenas Prácticas

#### Gestión de Secretos

**Principio:** Los secretos se gestionan de forma segura usando Supabase Secrets Management.

**Secretos Configurados:**
- `POLYGON_PRIVATE_KEY` - Clave privada para transacciones en Polygon
- `POLYGON_RPC_URL` - Endpoint RPC de Polygon
- `RESEND_API_KEY` - API key para envío de emails
- `BICONOMY_*` - Claves para account abstraction

#### Validación de Autoridad

**Principio:** Solo funciones autorizadas pueden emitir eventos de evidencia fuerte.

**Implementación:**
- Allowlist de fuentes por tipo de evento
- Validación de `_source` en `appendEvent()`
- Clasificación formal de eventos como `'evidence'` o `'tracking'`

#### Seguridad de Datos

**Principio:** El sistema no almacena contenido de documentos sin encriptación.

**Implementación:**
- Opción `hash_only` para no almacenar documentos
- Opción `encrypted_custody` para almacenamiento encriptado
- Client-side hashing antes de upload

### Sistema de Logs y Observabilidad

#### Logs de Decisiones del Executor

**Propósito:** Registrar todas las decisiones del executor para auditabilidad y debugging.

**Estructura:**
```ts
ExecutorDecisionLog {
  id: UUID
  document_entity_id: UUID
  policy_version: string
  events_hash: string
  decision: string[] // Array de jobs decididos
  reason: string
  metadata: JSON
  created_at: Timestamp
}
```

**Beneficios:**
- Trazabilidad completa de decisiones
- Identificación de responsables
- Verificación de consistencia
- Diagnóstico de problemas

### Clasificación de Eventos

**Principio:** Distinguir entre eventos de evidencia fuerte y eventos de seguimiento.

**Clasificación:**
- **Evidencia (`evidence`)**: `tsa.confirmed`, `anchor`, `artifact.finalized`
- **Seguimiento (`tracking`)**: `anchor.submitted`, `tsa.failed`, `anchor.failed`

**Validación:**
- Eventos de evidencia requieren `_source` verificable
- Eventos de seguimiento también requieren `_source` verificable
- Validación estricta de autoridad de emisor