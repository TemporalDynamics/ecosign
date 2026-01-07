# 🎯 ECOSIGN FLUJO ACTUAL — Resumen Canónico

**Fecha:** 2026-01-06  
**Basado en:** Contratos canónicos + Schema DB actual  
**Sprint enfoque:** Centro Legal UX + Modelo Firmantes + Firma Visual

---

## 📋 ENTIDADES CANÓNICAS

### 1. `document_entities` (Verdad Canónica)

**Representa:** La verdad de un documento en un momento del tiempo

```typescript
document_entities {
  // Identidad
  id: UUID
  owner_id: UUID
  
  // SOURCE TRUTH (inmutable)
  source_name: string
  source_mime: string
  source_size: bigint
  source_hash: string        // ⭐ IDENTIDAD PROBATORIA
  source_captured_at: timestamp
  source_storage_path?: string
  
  // CUSTODY
  custody_mode: 'hash_only' | 'encrypted_custody'
  
  // LIFECYCLE
  lifecycle_status:
    | 'protected'         // Hash capturado
    | 'needs_witness'     // Requiere PDF
    | 'witness_ready'     // PDF generado
    | 'in_signature_flow' // En firma
    | 'signed'            // Firmado
    | 'anchored'          // Anclado
    | 'revoked' | 'archived'
  
  // WITNESS (PDF derivado)
  witness_current_hash?: string
  witness_current_mime?: string = 'application/pdf'
  witness_current_status?: 'generated' | 'signed'
  witness_current_storage_path?: string
  witness_current_generated_at?: timestamp
  witness_history: JSONB[]  // Array de testigos previos
  
  // HASH CHAIN (append-only)
  witness_hash?: string      // ⭐ Hash del PDF testigo
  signed_hash?: string       // Hash del PDF firmado
  composite_hash?: string    // SmartHash (opcional)
  hash_chain: JSONB
  transform_log: JSONB[]     // Log de conversiones
  
  // EVENTS (append-only ledger)
  events: JSONB[]            // ⭐ FUENTE DE VERDAD
  tsa_latest?: JSONB         // Cache del último TSA
  signed_authority?: 'internal' | 'external'
  
  // Timestamps
  created_at: timestamp
  updated_at: timestamp
}
```

**Invariantes CRÍTICOS:**
- `source_hash` es INMUTABLE
- `events[]` es APPEND-ONLY
- `witness_hash` deriva de `source_hash`
- `signed_hash` deriva de `witness_hash`
- Protection level se DERIVA de `events[]`, nunca se guarda

---

### 2. `signature_workflows` (Flujo de Firma)

**Representa:** Un proceso de firma multi-parte con versionado

```typescript
signature_workflows {
  id: UUID
  owner_id: UUID
  
  // Documento
  original_filename: string
  original_file_url?: string
  current_version: number = 1
  
  // Estado
  status:
    | 'draft'      // Configurando
    | 'active'     // En proceso
    | 'paused'     // Pausado por cambios
    | 'completed'  // Todas las firmas ok
    | 'cancelled'  // Cancelado
  
  // Config protección
  forensic_config: {
    rfc3161: boolean = true
    polygon: boolean = true
    bitcoin: boolean = false
  }
  
  // Timestamps
  created_at: timestamp
  updated_at: timestamp
  completed_at?: timestamp
  cancelled_at?: timestamp
}
```

---

### 3. `workflow_signers` (Firmantes)

**Representa:** Quién firma, en qué orden, con qué requisitos

```typescript
workflow_signers {
  id: UUID
  workflow_id: UUID → signature_workflows
  
  // Orden y datos
  signing_order: number      // 1, 2, 3...
  email: string
  name?: string
  
  // Acceso
  require_login: boolean = false
  require_nda: boolean = false
  quick_access: boolean = false  // Solo email, sin NDA/Login
  
  // Estado
  status:
    | 'pending'            // Esperando turno
    | 'ready'              // Es su turno
    | 'signed'             // Ya firmó
    | 'requested_changes'  // Solicitó cambios
    | 'skipped'            // Saltado
  
  // Tracking
  access_token_hash?: string  // Hash del magic link
  first_accessed_at?: timestamp
  signed_at?: timestamp
  
  // Firma
  signature_data?: JSONB
  signature_hash?: string
  
  // Cambios solicitados
  change_request_data?: JSONB
  change_request_at?: timestamp
  change_request_status?: 'pending' | 'accepted' | 'rejected'
}
```

---

### 4. `workflow_signatures` (Certificación)

**Representa:** Registro INMUTABLE de cada firma (append-only)

```typescript
workflow_signatures {
  id: UUID
  workflow_id: UUID → signature_workflows
  version_id: UUID → workflow_versions
  signer_id: UUID → workflow_signers
  
  // Firma
  signature_image_url?: string
  signature_coordinates?: JSONB
  signature_hash: string
  
  // Certificación
  certification_data: JSONB    // ⭐ ECO completo
  eco_file_url?: string
  ecox_file_url?: string
  
  // Anchoring
  rfc3161_token?: string
  polygon_tx_hash?: string
  bitcoin_anchor_id?: UUID → anchors
  
  // Auditoría
  ip_address?: string
  user_agent?: string
  device_fingerprint?: string
  
  signed_at: timestamp
}
```

---

## 🔄 FLUJO COMPLETO (Happy Path)

### FASE 1: Creación de Documento

```
1. Usuario sube archivo
   ↓
2. Sistema calcula source_hash (SHA-256)
   ↓
3. Crea document_entities:
   - source_hash (inmutable)
   - custody_mode = 'encrypted_custody' o 'hash_only'
   - lifecycle_status = 'protected'
   - events = []
   ↓
4. (Opcional) Genera PDF witness:
   - witness_current_hash
   - witness_hash
   - transform_log += { from_hash → to_hash }
   - lifecycle_status = 'witness_ready'
```

### FASE 2: Configuración de Workflow

```
1. Usuario crea signature_workflow:
   - status = 'draft'
   - forensic_config (TSA/Polygon/Bitcoin)
   ↓
2. Usuario agrega firmantes (workflow_signers):
   - signing_order: 1, 2, 3...
   - email, name
   - require_login, require_nda, quick_access
   - status = 'pending'
   ↓
3. Usuario activa workflow:
   - status = 'draft' → 'active'
   - Primer firmante: status = 'pending' → 'ready'
   - Genera access_token para cada firmante
```

### FASE 3: Firma (por cada firmante)

```
1. Firmante accede via magic link
   - Valida access_token_hash
   - first_accessed_at = now()
   ↓
2. (Opcional) NDA / Login según config
   ↓
3. Firmante dibuja/coloca firma en PDF
   - signature_data (coordenadas, imagen)
   ↓
4. Sistema procesa firma:
   - Genera signed_hash del PDF firmado
   - Crea workflow_signatures (inmutable)
   - certification_data = ECO completo
   ↓
5. Identity event:
   events[] += {
     kind: 'identity',
     at: now(),
     level: 'L0' | 'L1',  // Determinar dinámicamente
     method: 'email_magic_link' | 'acknowledgement',
     signals: ['email_provided', 'email_verified', ...]
   }
   ↓
6. Signature event:
   events[] += {
     kind: 'signature',
     at: now(),
     signer_email: ...,
     witness_hash: ...,
     identity_level: 'L0' | 'L1'
   }
   ↓
7. workflow_signers:
   - status = 'ready' → 'signed'
   - signed_at = now()
   ↓
8. Siguiente firmante:
   - status = 'pending' → 'ready'
```

### FASE 4: Protección (Automática)

```
1. TSA (RFC 3161):
   events[] += {
     kind: 'tsa',
     at: now(),
     witness_hash: ...,
     tsa: { token_b64: ..., gen_time: ... }
   }
   tsa_latest = <evento TSA>
   ↓
2. Polygon Anchoring:
   events[] += {
     kind: 'anchor',
     at: now(),
     anchor: {
       network: 'polygon',
       witness_hash: ...,
       txid: ...,
       confirmed_at: ...
     }
   }
   ↓
3. (Opcional) Bitcoin Anchoring:
   events[] += {
     kind: 'anchor',
     at: now(),
     anchor: {
       network: 'bitcoin',
       witness_hash: ...,
       txid: ...,
       confirmed_at: ...
     }
   }
   ↓
4. lifecycle_status → 'anchored'
```

### FASE 5: Verificación

```
1. Usuario descarga .ECO / .ECOX
   ↓
2. Verificador lee certification_data
   ↓
3. Deriva protection_level desde events[]:
   - Sin TSA → NONE
   - TSA → ACTIVE
   - TSA + Polygon → REINFORCED
   - TSA + Polygon + Bitcoin → TOTAL
   ↓
4. Muestra en UI:
   - Protection: ACTIVE / REINFORCED / TOTAL
   - Identity: L0 / L1 / L2 / L3 / L4 / L5
   - Firmantes: [{email, signed_at, identity_level}]
```

---

## 🔑 CONCEPTOS CLAVE (Naming Correcto)

### Source Truth (Verdad de Origen)
- **Es:** El documento original inmutable
- **Hash:** `source_hash`
- **Almacenamiento:** `source_storage_path` (si custody)
- **Invariante:** NUNCA cambia

### Visual Witness (Testigo Visual)
- **Es:** PDF derivado del source (para visualización/firma)
- **Hash:** `witness_hash`
- **Relación:** Deriva de `source_hash`
- **Regla:** El PDF NO es la verdad, es un TESTIGO

### Hash Chain (Cadena de Hashes)
```
source_hash → witness_hash → signed_hash
```
- Append-only
- Cada eslabón deriva del anterior
- Romper un eslabón invalida todo lo posterior

### Events Ledger (Ledger de Eventos)
- **Es:** `document_entities.events[]`
- **Append-only:** Solo se agregan eventos, nunca se editan/borran
- **Fuente de verdad:** Protection level se DERIVA de aquí
- **Tipos:** `tsa`, `anchor`, `identity`, `signature`

### Protection Level (Nivel de Protección)
- **NO es:** Un campo en DB
- **ES:** Derivación pura desde `events[]`
- **Niveles:** NONE → ACTIVE → REINFORCED → TOTAL
- **Monotonía:** Solo sube, nunca baja

### Identity Level (Nivel de Identidad)
- **NO es:** Binario "verificado/no verificado"
- **ES:** Continuo L0 → L1 → L2 → L3 → L4 → L5
- **Separado:** Identidad ≠ Protección
- **Append-only:** Nuevas firmas con L4 no mejoran firmas L1 previas

---

## 🚫 PROHIBICIONES CANÓNICAS

### ❌ NO mezclar conceptos
```
Identidad ≠ Protección ≠ Firma certificada
```

### ❌ NO actualizar el pasado
```
events[] es append-only
source_hash es inmutable
```

### ❌ NO inferir protection level
```
// ❌ MAL
const level = document.tsa_token ? 'ACTIVE' : 'NONE'

// ✅ BIEN
const level = deriveProtectionLevel(document.events)
```

### ❌ NO prometer más de lo que hay
```
// ❌ MAL
"Firma certificada" (sin L5)
"Identidad verificada" (sin especificar nivel)

// ✅ BIEN
"Identidad verificada mediante email" (L1)
"Protección: Máxima (TSA + Polygon + Bitcoin)"
```

---

## 📍 ESTADO ACTUAL (2026-01-06)

### ✅ Implementado
- document_entities con events[]
- TSA events canónicos
- Anchor events (Polygon + Bitcoin)
- Protection level derivado
- Identity contract cerrado (L0-L5)
- Workflow básico

### 🔄 En Progreso
- Centro Legal UX (draft/protected toggle)
- Identity level dinámico (backend)
- Modelo de firmantes (orden, roles, requisitos)

### 🔮 Próximo
- Firma visual (drag & drop, campos)
- Batch de firmantes
- PDF Witness avanzado
- L2/L3 (OTP/Passkey)

---

## 🎯 PARA EL SPRINT ACTUAL

### BLOQUE 1: Centro Legal UX
**Objetivo:** Usuario entiende draft vs protected

**UI Estados:**
- 🟡 Draft → "Borrador (sin protección)"
- 🟢 Protected → "Protegido (TSA activo)"

**Toggle:**
- Default: ON (protección automática)
- Si OFF: Advertencia clara
- "No volver a mostrar" para usuarios avanzados

### BLOQUE 2: Modelo Firmantes
**Objetivo:** Entender quién firma, cuándo, cómo

**Key Concepts:**
- `signing_order` determina secuencia
- `require_login` / `require_nda` / `quick_access`
- `status` refleja estado en workflow
- Eventos de identidad por firmante

### BLOQUE 3: Firma Visual
**Objetivo:** UX estándar de mercado

**Mínimo viable:**
- Drag & drop firma
- Duplicar en todas las páginas
- Campos: firma, texto, fecha
- Preview antes de confirmar

---

**Documento vivo:** Actualizar al agregar features nuevas  
**Fuente:** docs/contratos/ + supabase/migrations/
