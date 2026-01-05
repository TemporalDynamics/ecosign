# 📊 REPORTE TÉCNICO COMPLETO: ARQUITECTURA ACTUAL DE ECOSIGN

**Fecha:** 2026-01-05 05:22 UTC  
**Objetivo:** Mapeo completo pre-refactor "Documento Original + Testigo"  
**Estado:** DIAGNÓSTICO COMPLETO  

---

## 1️⃣ **CONTRATO CANÓNICO ACTUAL DE "DOCUMENTO"**

### **🎯 RESPUESTA DIRECTA**

**¿Qué es un "documento" hoy en EcoSign?**

EcoSign tiene **TRES modelos de documento** coexistiendo (no consolidados):

1. **`documents`** (tabla original - sistema de share/verify)
2. **`user_documents`** (tabla nueva - sistema de certificación PDF)
3. **`eco_records`** (tabla legacy - primer prototipo)

---

### **📋 SCHEMA 1: `documents` (Sistema de compartir/verify)**

**Ubicación:** `supabase/migrations/001_core_schema.sql`

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  original_filename TEXT,
  eco_hash TEXT NOT NULL,          -- SHA-256 del archivo .ECO
  ecox_hash TEXT,                  -- SHA-256 del archivo .ECOX (opcional)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'archived')),
  
  -- E2E Encryption (agregado después)
  encrypted BOOLEAN DEFAULT FALSE,
  encrypted_path TEXT,
  wrapped_key TEXT,
  wrap_iv TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

**📌 Campos clave:**
- `eco_hash` → Hash del certificado .ECO (NO del documento original)
- `ecox_hash` → Hash del .ECOX con trazabilidad
- `encrypted` → Si está cifrado E2E
- `wrapped_key` → Document key envuelta (solo descifrable con session key)

**❌ Problemas:**
- NO hay campo `original_file_type` o `mime_type`
- NO distingue entre "hash del documento" vs "hash del certificado"
- NO tiene referencia al archivo original (solo al .ECO)

---

### **📋 SCHEMA 2: `user_documents` (Sistema de certificación PDF)**

**Ubicación:** `supabase/migrations/20251115220000_007_user_documents.sql`

```sql
CREATE TABLE user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Document metadata
  document_name TEXT NOT NULL,
  document_hash TEXT NOT NULL,        -- ⚠️ CRÍTICO: Hash del PDF
  document_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',  -- ⚠️ ASUME PDF

  -- Storage paths
  pdf_storage_path TEXT NOT NULL,     -- Path del PDF en Storage
  eco_data JSONB NOT NULL,            -- Certificado .ECO completo

  -- SignNow metadata (si está firmado)
  signnow_document_id TEXT,
  signnow_status TEXT,
  signed_at TIMESTAMPTZ,

  -- Timestamps and anchors
  certified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  has_legal_timestamp BOOLEAN DEFAULT false,
  has_bitcoin_anchor BOOLEAN DEFAULT false,
  bitcoin_anchor_id UUID REFERENCES anchors(id) ON DELETE SET NULL,

  -- E2E Encryption (agregado después)
  encrypted BOOLEAN DEFAULT FALSE,
  encrypted_path TEXT,
  wrapped_key TEXT,
  wrap_iv TEXT,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  is_archived BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

**📌 Campos clave:**
- `document_hash` → SHA-256 del PDF (o archivo original si no es PDF)
- `mime_type` → DEFAULT `application/pdf` ⚠️ **ASUME PDF**
- `pdf_storage_path` → Path del PDF en Supabase Storage
- `eco_data` → Certificado .ECO completo como JSONB

**❌ Problemas:**
- `mime_type` tiene DEFAULT `application/pdf` → **fuertemente orientado a PDF**
- `pdf_storage_path` → nombre del campo asume que siempre es PDF
- NO hay campo `original_file_path` separado de `pdf_storage_path`
- El hash es del PDF, no del documento original si hubo conversión

---

### **📋 SCHEMA 3: `eco_records` (Legacy - primer prototipo)**

**Ubicación:** `supabase/migrations/20251107050603_001_create_verifysign_schema.sql`

```sql
CREATE TABLE eco_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT NOT NULL UNIQUE,
  user_email TEXT NOT NULL,

  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,

  sha256_hash TEXT NOT NULL,
  eco_metadata JSONB NOT NULL,

  blockchain_tx_id TEXT,
  blockchain_network TEXT DEFAULT 'ecosign-testnet',

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'anchored', 'verified', 'revoked')),

  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**📌 Campos clave:**
- `sha256_hash` → Hash del documento
- `file_type` → MIME type del archivo
- `eco_metadata` → Metadata del certificado
- `status` → Estados del documento

**✅ Lo bueno:**
- SÍ tiene `file_type` (no asume PDF)
- Tiene campo de `status` con estados claros

**❌ Problemas:**
- Es una tabla legacy (no se usa en el flujo principal)
- Duplica lógica de las otras dos tablas

---

## 2️⃣ **PUNTO EXACTO DONDE SE CALCULA EL HASH**

### **🎯 RESPUESTA DIRECTA**

El hash se calcula en **DOS lugares distintos**, dependiendo del flujo:

---

### **📍 LUGAR 1: `hashDocument.ts` (Flujo principal)**

**Archivo:** `client/src/utils/hashDocument.ts`

```typescript
/**
 * Calculate SHA-256 hash of a file
 * @param file - File object (PDF)
 * @returns Hex string of the hash
 */
export async function calculateDocumentHash(file: File): Promise<string> {
  try {
    // Read file as ArrayBuffer
    const buffer = await file.arrayBuffer()

    // Calculate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    return hashHex
  } catch (error) {
    console.error('Error calculating document hash:', error)
    throw new Error('Failed to calculate document hash')
  }
}
```

**📌 Características:**
- ✅ Recibe `File` (objeto del navegador)
- ✅ Calcula hash del **archivo original sin modificar**
- ✅ Se ejecuta **ANTES** de cualquier conversión o cifrado
- ✅ Usa `crypto.subtle.digest()` (estándar Web Crypto API)

**Usado en:**
- `DocumentUploader.tsx` (línea 66)
- `encryptedDocumentStorage.ts` (línea 54)
- Flujo de protección de documentos

---

### **📍 LUGAR 2: `basicCertificationWeb.ts` (Certificación ECO)**

**Archivo:** `client/src/lib/basicCertificationWeb.ts`

```typescript
/**
 * Calculates digital fingerprint (browser-compatible)
 * @param {Uint8Array} data - Data to fingerprint
 * @returns {string} Hex string
 */
function calculateSHA256(data: Uint8Array): string {
  const hash = sha256(data);  // @noble/hashes
  return bytesToHex(hash);
}

// Usado en certifyFile():
const fileBuffer = await readFileAsArrayBuffer(file);
const fileArray = new Uint8Array(fileBuffer);
const hash = calculateSHA256(fileArray);  // Línea 301
```

**📌 Características:**
- ✅ Recibe `Uint8Array` (bytes del archivo)
- ✅ Usa librería `@noble/hashes` (no Web Crypto API)
- ✅ Calcula hash del **archivo original**
- ✅ Se ejecuta ANTES de generar el .ECO

**Usado en:**
- Flujo de certificación (generar .ECO)
- Flujo de verificación

---

### **🔍 DIFERENCIAS CLAVE**

| Aspecto | `hashDocument.ts` | `basicCertificationWeb.ts` |
|---------|-------------------|----------------------------|
| Input | `File` | `Uint8Array` |
| Librería | Web Crypto API | @noble/hashes |
| Usado en | Upload/Storage | Certificación ECO |
| Momento | ANTES de cifrado | ANTES de .ECO |

**✅ LO IMPORTANTE (RESPUESTA A TU PREGUNTA):**

> **El hash SE CALCULA SIEMPRE sobre el archivo ORIGINAL, ANTES de:**
> - Conversión a PDF
> - Cifrado
> - Generación de .ECO
> - Cualquier transformación

**Esto significa que estás MÁS CERCA de lo que pensabas del modelo "Documento Original + Testigo".**

---

## 3️⃣ **FLUJO ACTUAL DE "PROTEGER SIN FIRMA"**

### **🎯 RESPUESTA DIRECTA**

Hoy existen **DOS flujos de protección**:

---

### **📍 FLUJO 1: Protección con cifrado E2E** (Nuevo)

**Archivo:** `client/src/lib/storage/encryptedDocumentStorage.ts`

```typescript
export async function uploadEncryptedDocument(
  options: UploadEncryptedDocumentOptions
): Promise<UploadEncryptedDocumentResult> {
  const { file, userId, encrypt = false, metadata = {} } = options;

  // 1. Calculate hash of ORIGINAL file (before encryption)
  const originalHash = await sha256File(file);
  
  // 2. If encryption requested, encrypt the file
  if (encrypt) {
    // Generate unique document key
    const documentKey = await generateDocumentKey();
    
    // Encrypt file
    const encryptedBlob = await encryptFile(file, documentKey);
    
    // Wrap document key with session unwrap key
    const sessionUnwrapKey = getSessionUnwrapKey();
    const wrapped = await wrapDocumentKey(documentKey, sessionUnwrapKey);
    
    storagePath = `encrypted/${userId}/${originalHash}.enc`;
  } else {
    // Standard upload (not encrypted)
    storagePath = `documents/${userId}/${originalHash}_${file.name}`;
  }

  // 3. Upload to Supabase Storage
  await supabase.storage
    .from('user-documents')
    .upload(storagePath, uploadBlob, {
      upsert: true,
      contentType: encrypt ? 'application/octet-stream' : file.type,
    });

  // 4. Create database record
  const documentId = crypto.randomUUID();
  await supabase.from('documents').insert({
    id: documentId,
    owner_id: userId,
    filename: file.name,
    file_type: file.type,
    file_size: file.size,
    hash: originalHash,  // ⚠️ Hash del original
    encrypted: encrypt,
    encrypted_path: encrypt ? storagePath : null,
    pdf_storage_path: encrypt ? null : storagePath,
    wrapped_key: wrappedKey,
    wrap_iv: wrapIv,
    status: 'uploaded',
  });

  return {
    documentId,
    hash: originalHash,
    encrypted: encrypt,
    storagePath,
    wrappedKey,
    wrapIv,
  };
}
```

**📌 ¿Qué se guarda?**

| Encrypt = false | Encrypt = true |
|----------------|----------------|
| ✅ Archivo original en Storage | ✅ Archivo **cifrado** en Storage |
| ✅ Hash en DB | ✅ Hash del **original** en DB |
| ✅ Path en `pdf_storage_path` | ✅ Path en `encrypted_path` |
| ❌ NO wrapped_key | ✅ `wrapped_key` (clave envuelta) |

**❌ Problemas detectados:**
- Campo `pdf_storage_path` asume PDF (aunque el archivo no lo sea)
- NO hay campo `original_file_type` separado de `file_type`
- Si `encrypt = false`, el archivo NO cifrado va a Storage (⚠️ **no es Zero Knowledge**)

---

### **📍 FLUJO 2: Certificación con .ECO** (Legacy mejorado)

**Archivo:** `client/src/lib/basicCertificationWeb.ts`

```typescript
export async function certifyFile(file: File, options: CertificationOptions = {}): Promise<any> {
  // 1. Read file as ArrayBuffer
  const fileBuffer = await readFileAsArrayBuffer(file);
  const fileArray = new Uint8Array(fileBuffer);

  // 2. Calculate digital fingerprint (hash)
  const hash = calculateSHA256(fileArray);

  // 3. Generate or use provided keys
  const { privateKey, publicKey } = options.privateKey && options.publicKey
    ? { privateKey: options.privateKey, publicKey: options.publicKey }
    : await generateKeys();

  // 4. Create timestamp (with optional legal timestamp certification)
  let timestamp = new Date().toISOString();
  let tsaResponse: TsaResponse | null = null;
  
  if (options.useLegalTimestamp) {
    const response = await requestLegalTimestamp(hash);
    if (response.success) {
      tsaResponse = response;
      timestamp = tsaResponse.timestamp!;
    }
  }

  // 5. Create EcoProject manifest
  const project = {
    version: '1.1.0',
    projectId: `doc-${Date.now()}`,
    metadata: {
      title: file.name,
      description: `Certified document: ${file.name}`,
      createdAt: timestamp,
      author: options.userEmail || 'anonymous',
    },
    assets: [{
      assetId: `asset-${Date.now()}`,
      type: 'document',
      name: file.name,
      mimeType: file.type || 'application/octet-stream',  // ⚠️ REGISTRA MIME TYPE
      size: file.size,
      hash: hash,  // ⚠️ Hash del original
    }],
  };

  // 6. Sign the manifest
  const manifestJson = JSON.stringify(project);
  const signature = await signMessage(manifestJson, privateKey);

  // 7. Create unified .eco format (JSON with manifest + signatures + metadata)
  const ecoPayload = {
    version: '1.1.0',
    projectId: project.projectId,
    manifest: project,
    signatures: [{
      signerId: options.userEmail || 'anonymous',
      publicKey: publicKey,
      signature: signature,
      algorithm: 'Ed25519',
      timestamp: timestamp,
      legalTimestamp: tsaResponse && tsaResponse.success ? {
        standard: 'RFC 3161',
        tsa: tsaResponse.tsaUrl,
        token: tsaResponse.token,
      } : null
    }],
    metadata: {
      certifiedAt: timestamp,
      certifiedBy: 'EcoSign',
      forensicEnabled: options.useLegalTimestamp || options.usePolygonAnchor || options.useBitcoinAnchor,
      anchoring: {
        polygon: options.usePolygonAnchor || false,
        bitcoin: options.useBitcoinAnchor || false
      },
    },
  };

  // Convert to JSON string and return as ArrayBuffer
  const ecoJson = JSON.stringify(ecoPayload, null, 2);
  const encoder = new TextEncoder();
  const arrayBuffer = encoder.encode(ecoJson);

  return {
    fingerprint: hash,  // ⚠️ Hash del original
    timestamp,
    publicKey,
    signature,
    ecoData: arrayBuffer.buffer,  // ⚠️ .ECO como ArrayBuffer
    tsaResponse,
  };
}
```

**📌 ¿Qué se guarda?**

| Elemento | Dónde | Qué contiene |
|----------|-------|--------------|
| **Hash del original** | `.eco → manifest → assets[0].hash` | SHA-256 del archivo original |
| **MIME Type** | `.eco → manifest → assets[0].mimeType` | Tipo del archivo original |
| **Metadata** | `.eco → metadata` | Timestamp, TSA, anchoring |
| **Firmas** | `.eco → signatures` | Ed25519 signature + public key |

**✅ LO BUENO:**
- El .ECO **SÍ registra el MIME type** del archivo original
- El hash **SÍ es del archivo original**
- Metadata forensic completa

**❌ Problemas:**
- El .ECO NO se sube a Storage automáticamente (solo se genera en cliente)
- NO hay referencia del .ECO al archivo original en Storage
- NO hay "chain of custody" explícito

---

## 4️⃣ **STORAGE: QUÉ SE GUARDA HOY Y CUÁNDO**

### **🎯 RESPUESTA DIRECTA**

**Bucket:** `user-documents` (Supabase Storage)

---

### **📦 CASO 1: Proteger (sin firma)**

#### **Con E2E Encryption (`encrypt = true`)**

```
Storage Path: encrypted/{userId}/{hash}.enc
Content-Type: application/octet-stream
Contenido: ✅ Archivo cifrado con AES-256-GCM
```

**DB Record (`documents`):**
```json
{
  "id": "uuid",
  "owner_id": "user-id",
  "filename": "contrato.pdf",
  "file_type": "application/pdf",
  "hash": "sha256-del-original",
  "encrypted": true,
  "encrypted_path": "encrypted/{userId}/{hash}.enc",
  "wrapped_key": "base64-wrapped-key",
  "wrap_iv": "hex-iv"
}
```

#### **Sin Encryption (`encrypt = false`)**

```
Storage Path: documents/{userId}/{hash}_{filename}
Content-Type: application/pdf (o el MIME type original)
Contenido: ⚠️ Archivo sin cifrar (NO es Zero Knowledge)
```

**DB Record (`documents`):**
```json
{
  "id": "uuid",
  "owner_id": "user-id",
  "filename": "contrato.pdf",
  "file_type": "application/pdf",
  "hash": "sha256-del-original",
  "encrypted": false,
  "pdf_storage_path": "documents/{userId}/{hash}_{filename}"
}
```

---

### **📦 CASO 2: Firmar (con LegalSign o SignNow)**

**Storage:**
```
Path: documents/{userId}/{hash}_signed_{filename}
Content-Type: application/pdf
Contenido: PDF firmado (con firma visual aplicada)
```

**DB Record (`user_documents`):**
```json
{
  "id": "uuid",
  "user_id": "user-id",
  "document_name": "contrato_firmado.pdf",
  "document_hash": "sha256-del-pdf-firmado",  // ⚠️ Hash del PDF firmado, NO del original
  "mime_type": "application/pdf",
  "pdf_storage_path": "documents/{userId}/{hash}_signed_{filename}",
  "eco_data": {
    // Certificado .ECO completo como JSONB
    "manifest": {
      "assets": [{
        "hash": "sha256-del-pdf-firmado"  // ⚠️ Hash del PDF firmado
      }]
    }
  },
  "signnow_document_id": "signnow-id",
  "signed_at": "2026-01-05T05:00:00Z"
}
```

**❌ PROBLEMA CRÍTICO:**
- El hash en `user_documents.document_hash` es del **PDF firmado**, NO del original
- El .ECO almacenado en `eco_data` también referencia el PDF firmado
- NO hay rastro del documento original si hubo conversión o firma visual

---

### **📦 CASO 3: Flujo de firmas (múltiples firmantes)**

**Storage:**
```
Path: documents/{userId}/{workflow_id}_{hash}.pdf
Content-Type: application/pdf
Contenido: PDF original (antes de firmas)
```

**DB Record (`signature_workflows`):**
```json
{
  "id": "uuid",
  "owner_id": "user-id",
  "document_name": "contrato.pdf",
  "document_hash": "sha256-del-pdf-original",
  "pdf_storage_path": "documents/{userId}/{workflow_id}_{hash}.pdf",
  "status": "pending",  // pending | completed | expired
  "signers": [
    {
      "email": "signer@example.com",
      "status": "pending",
      "signature_data": null
    }
  ]
}
```

**Después de firmar:**
```
Path: documents/{userId}/{workflow_id}_{hash}_signed.pdf
Content-Type: application/pdf
Contenido: PDF con todas las firmas visuales aplicadas
```

**❌ PROBLEMA:**
- NO se preserva el PDF original después de las firmas
- El hash final es del PDF firmado, NO del original

---

### **📦 CASO 4: Compartir documento**

**Storage:**
- NO se sube nada nuevo
- Se usa el archivo existente (cifrado o sin cifrar)

**DB Record (`document_shares`):**
```json
{
  "id": "uuid",
  "document_id": "ref-to-documents",
  "share_token": "base64-token",
  "otp_hash": "sha256-of-otp",
  "expires_at": "2026-01-10T00:00:00Z",
  "wrapped_key_for_share": "base64-wrapped-key-for-recipient"
}
```

**Flujo:**
1. Usuario crea share link
2. Se genera OTP
3. Se envuelve document key con OTP-derived key
4. Recipient abre link, ingresa OTP
5. Se desenvuelve document key
6. Se descifra documento en cliente

---

### **🔍 RESUMEN: ¿Qué se guarda dónde?**

| Flujo | Storage | DB | Observaciones |
|-------|---------|-----|---------------|
| **Proteger (E2E)** | ✅ Archivo cifrado `.enc` | ✅ `documents` con `encrypted=true` | ✅ Zero Knowledge |
| **Proteger (sin E2E)** | ⚠️ Archivo sin cifrar | ✅ `documents` con `encrypted=false` | ❌ NO es Zero Knowledge |
| **Firmar** | ✅ PDF firmado | ✅ `user_documents` con `eco_data` | ❌ Hash del PDF firmado, NO original |
| **Flujo firmas** | ✅ PDF original → PDF firmado | ✅ `signature_workflows` | ❌ Original se pierde después de firmas |
| **Compartir** | ❌ Nada nuevo | ✅ `document_shares` | ✅ Usa archivo existente |

---

## 5️⃣ **ESTADOS ACTUALES DEL DOCUMENTO**

### **🎯 RESPUESTA DIRECTA**

NO hay un **FSM (Finite State Machine) unificado**.

Hay **estados dispersos en múltiples tablas**:

---

### **📍 ESTADOS EN `documents`**

```sql
status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'archived'))
```

**Estados:**
- `active` → Documento activo
- `revoked` → Documento revocado (no se puede compartir)
- `archived` → Documento archivado (soft delete)

**❌ Problemas:**
- NO refleja estados de procesamiento
- NO refleja estados de firma
- NO refleja estados de anchoring

---

### **📍 ESTADOS EN `user_documents`**

```sql
-- Booleanos sueltos (no enum):
has_legal_timestamp BOOLEAN DEFAULT false
has_bitcoin_anchor BOOLEAN DEFAULT false
is_archived BOOLEAN DEFAULT false

-- SignNow status (texto libre):
signnow_status TEXT  -- 'pending', 'completed', etc.
```

**Estados implícitos:**
- ✅ Si `signnow_document_id IS NOT NULL` → está en SignNow
- ✅ Si `signed_at IS NOT NULL` → fue firmado
- ✅ Si `has_legal_timestamp = true` → tiene RFC 3161
- ✅ Si `has_bitcoin_anchor = true` → anclado en Bitcoin
- ✅ Si `is_archived = true` → archivado

**❌ Problemas:**
- NO hay campo `status` unificado
- Estados son "booleanos sueltos" (difícil de consultar)
- NO hay validación de transiciones de estado

---

### **📍 ESTADOS EN `eco_records` (Legacy)**

```sql
status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'anchored', 'verified', 'revoked'))
```

**Estados:**
- `pending` → Esperando anclaje blockchain
- `anchored` → Anclado en blockchain
- `verified` → Verificado externamente
- `revoked` → Revocado

**✅ LO BUENO:**
- Enum explícito con CHECK constraint
- Estados claros y ordenados

**❌ Problemas:**
- Tabla legacy (no se usa en flujo principal)

---

### **📍 ESTADOS EN `signature_workflows`**

```sql
status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'expired', 'cancelled'))
```

**Estados:**
- `pending` → Esperando primera firma
- `in_progress` → Al menos un firmante firmó
- `completed` → Todos firmaron
- `expired` → Workflow expiró (deadline pasado)
- `cancelled` → Cancelado por owner

**✅ LO BUENO:**
- Enum claro con transiciones lógicas

---

### **📍 ESTADOS EN `anchors` (Blockchain)**

```sql
-- No tiene campo status explícito
-- Estado se infiere de la existencia del registro
```

**Estados implícitos:**
- ✅ Si existe registro → anclado
- ❌ Si no existe → no anclado

**Campos relacionados:**
```sql
chain TEXT NOT NULL CHECK (chain IN ('bitcoin', 'polygon', 'ethereum'))
tx_id TEXT NOT NULL
proof_url TEXT  -- URL del .ots o proof file
anchored_at TIMESTAMPTZ DEFAULT now()
```

**❌ Problemas:**
- NO hay estados intermedios (pending, confirming, confirmed)
- NO hay retry logic visible
- NO hay error states

---

### **🔍 DIAGRAMA DE ESTADOS ACTUAL (RECONSTRUIDO)**

```
┌─────────────────────────────────────────────┐
│          ESTADOS IMPLÍCITOS HOY             │
└─────────────────────────────────────────────┘

📄 DOCUMENTO SIN FIRMAR
    ↓
    ├─ [Proteger sin firma]
    │   ↓
    │   uploaded (implicit)
    │       ├─ encrypted = true  → ✅ Zero Knowledge
    │       └─ encrypted = false → ⚠️ Sin cifrar
    │
    ├─ [Certificar con .ECO]
    │   ↓
    │   certified (implicit)
    │       ├─ has_legal_timestamp = true
    │       └─ has_legal_timestamp = false
    │
    ├─ [Anclar en blockchain]
    │   ↓
    │   anchored (implicit)
    │       ├─ Polygon (pending → confirmed)
    │       └─ Bitcoin (pending → mined)
    │
    └─ [Firmar]
        ↓
        signature_workflow.status:
            pending → in_progress → completed
            ↓
            signed (user_documents.signed_at NOT NULL)

📄 DOCUMENTO FIRMADO
    ↓
    ├─ [Compartir]
    │   ↓
    │   shared (document_shares exists)
    │       └─ expires_at (active | expired)
    │
    └─ [Verificar]
        ↓
        verified (access_events.event_type = 'verified')
```

**❌ PROBLEMA FUNDAMENTAL:**

NO hay un "documento central" con estados unificados.

Cada flujo tiene sus propios estados en tablas distintas.

---

## 6️⃣ **QUÉ ENTIENDE HOY EL VERIFICADOR .ECO**

### **🎯 RESPUESTA DIRECTA**

El verificador .ECO **NO distingue entre documento original y testigo**.

---

### **📋 ESTRUCTURA ACTUAL DEL .ECO**

**Archivo:** `client/src/lib/basicCertificationWeb.ts` (línea 224-272)

```json
{
  "version": "1.1.0",
  "projectId": "doc-1735123456789",
  "certificate_schema_version": "1.0",
  
  "manifest": {
    "projectId": "doc-1735123456789",
    "metadata": {
      "title": "contrato.pdf",
      "description": "Certified document: contrato.pdf",
      "author": "user@example.com"
    },
    "assets": [
      {
        "assetId": "asset-1735123456789",
        "type": "document",
        "name": "contrato.pdf",
        "mimeType": "application/pdf",  // ⚠️ REGISTRA MIME TYPE
        "size": 102400,
        "hash": "abc123...def789"  // ⚠️ UN SOLO HASH
      }
    ]
  },
  
  "signatures": [
    {
      "signatureId": "sig-1735123456789",
      "signerId": "user@example.com",
      "publicKey": "ed25519-public-key-hex",
      "signature": "ed25519-signature-hex",
      "algorithm": "Ed25519",
      "timestamp": "2026-01-05T05:00:00Z",
      
      "legalTimestamp": {  // ⚠️ OPCIONAL (si useLegalTimestamp = true)
        "standard": "RFC 3161",
        "tsa": "freetsa.org",
        "tsaUrl": "https://freetsa.org/tsr",
        "token": "base64-tsa-token",
        "tokenSize": 4096,
        "algorithm": "SHA-256",
        "verified": true
      }
    }
  ],
  
  "metadata": {
    "certifiedAt": "2026-01-05T05:00:00Z",
    "certifiedBy": "EcoSign",
    "forensicEnabled": true,
    "anchoring": {
      "polygon": true,
      "bitcoin": true
    },
    "timestampType": "RFC 3161 Legal"
  },
  
  "intended_use": {
    "legal_context": "evidence_of_integrity_and_time",
    "jurisdiction": "unspecified",
    "not_a_qes": true
  }
}
```

---

### **🔍 ANÁLISIS CRÍTICO**

#### **✅ LO QUE SÍ TIENE:**

1. **MIME Type del original:**
   ```json
   "assets": [{
     "mimeType": "application/pdf"
   }]
   ```

2. **Hash del archivo:**
   ```json
   "assets": [{
     "hash": "abc123...def789"
   }]
   ```

3. **Metadata forensic:**
   - Timestamp
   - TSA token (si `useLegalTimestamp = true`)
   - Anchoring flags (Polygon, Bitcoin)

#### **❌ LO QUE NO TIENE:**

1. **NO hay campo `parent_hash` o `source_hash`**
   - Solo hay UN hash en `assets[0].hash`
   - NO distingue entre:
     - Hash del documento original
     - Hash del documento transformado (PDF normalizado, firmado, etc.)

2. **NO hay "chain of hashes"**
   - NO hay campo tipo:
     ```json
     "hash_chain": {
       "original": "hash-del-docx",
       "canonical": "hash-del-pdf",
       "signed": "hash-del-pdf-firmado"
     }
     ```

3. **NO hay referencia al archivo en Storage**
   - El .ECO NO sabe dónde está el archivo original
   - NO hay campo tipo:
     ```json
     "storage": {
       "original_path": "documents/{userId}/{hash}_original.docx",
       "canonical_path": "documents/{userId}/{hash}_canonical.pdf"
     }
     ```

4. **NO hay transformaciones registradas**
   - Si el documento fue convertido de DOCX → PDF, NO se registra
   - NO hay campo tipo:
     ```json
     "transformations": [
       {
         "from": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
         "to": "application/pdf",
         "method": "client-side conversion",
         "original_hash": "hash-del-docx",
         "result_hash": "hash-del-pdf"
       }
     ]
     ```

---

### **🔍 ¿EL VERIFICADOR ASUME PDF?**

**Respuesta corta:** NO explícitamente, pero **implícitamente SÍ**.

**Evidencia:**

1. **Campo `pdf_storage_path` en DB:**
   ```sql
   pdf_storage_path TEXT NOT NULL  -- ⚠️ Nombre asume PDF
   ```

2. **Default MIME type en `user_documents`:**
   ```sql
   mime_type TEXT NOT NULL DEFAULT 'application/pdf'
   ```

3. **Documentación interna:**
   ```typescript
   // client/src/utils/hashDocument.ts
   /**
    * Calculate SHA-256 hash of a file
    * @param file - File object (PDF)  // ⚠️ Comentario asume PDF
    */
   ```

4. **Flujo de firma visual:**
   - Solo funciona con PDF (usa `pdf-lib`)
   - NO hay conversión de otros formatos a PDF antes de firmar

**PERO:**

El .ECO **SÍ registra el MIME type original:**
```json
"assets": [{
  "mimeType": "application/pdf"  // o "application/vnd.ms-word", etc.
}]
```

**Esto significa que el verificador PODRÍA soportar otros formatos, pero:**
- El flujo actual NO lo facilita
- La UI asume PDF
- El almacenamiento asume PDF

---

## 7️⃣ **CONCLUSIONES Y RECOMENDACIONES**

### **✅ LO QUE ESTÁ BIEN (MÁS DE LO QUE PENSABAS)**

1. **El hash SE CALCULA ANTES de cualquier transformación**
   - ✅ En `hashDocument.ts` (línea 18): `file.arrayBuffer()` → sin modificar
   - ✅ En `basicCertificationWeb.ts` (línea 301): hash del archivo original

2. **El .ECO SÍ registra el MIME type original**
   - ✅ En `manifest.assets[0].mimeType`

3. **Hay soporte básico para E2E encryption**
   - ✅ `encrypted`, `wrapped_key`, `wrap_iv` en DB
   - ✅ Flow de cifrado/descifrado en cliente

4. **Hay evidencia de "custodia" implícita**
   - ✅ Hash del original se guarda en DB
   - ✅ Archivo (cifrado o no) se guarda en Storage

---

### **❌ LO QUE FALTA (PARA "DOCUMENTO ORIGINAL + TESTIGO")**

1. **NO hay separación explícita entre:**
   - Hash del documento original (fuente)
   - Hash del documento canónico (PDF normalizado)
   - Hash del documento transformado (firmado, sellado)

2. **NO hay "chain of custody" visible**
   - NO se registran transformaciones
   - NO hay "parent_hash" o "source_hash"

3. **NO hay distinción entre "custodia" y "protección sin custodia"**
   - Si `encrypted = false`, el archivo está en Storage sin cifrar
   - NO hay modo "solo hash + .ECO" sin subir archivo

4. **NO hay un FSM unificado**
   - Estados dispersos en múltiples tablas
   - Difícil saber "en qué estado está" un documento

5. **El verificador NO entiende "SmartHash" o "Doble Hash"**
   - Solo hay UN hash en el .ECO
   - NO hay encadenamiento de hashes

---

### **🎯 DISTANCIA AL MODELO "DOCUMENTO ORIGINAL + TESTIGO"**

```
Modelo Ideal:
┌────────────────────────────────────┐
│ DOCUMENTO ORIGINAL (inmutable)     │ → Hash A
│ - Cualquier formato (DOCX, PDF)    │
│ - Sin transformar                  │
│ - Custodia opcional                │
└────────────────────────────────────┘
           ↓
┌────────────────────────────────────┐
│ TESTIGO (transformaciones)         │ → Hash B
│ - PDF normalizado (si no era PDF)  │
│ - Firmas visuales aplicadas        │
│ - Sellos de tiempo                 │
│ - SmartHash = Hash(A + B + metadata) │
└────────────────────────────────────┘
           ↓
┌────────────────────────────────────┐
│ ECO (certificado)                  │
│ - hash_chain: [A, B, SmartHash]    │
│ - transformations: [...]           │
│ - custody: true/false              │
└────────────────────────────────────┘

Modelo Actual:
┌────────────────────────────────────┐
│ DOCUMENTO (implícitamente PDF)     │ → Hash X
│ - Se asume PDF o se convierte      │
│ - Hash calculado ANTES conversión  │ ⚠️ Pero conversión no registrada
└────────────────────────────────────┘
           ↓
┌────────────────────────────────────┐
│ ECO (certificado)                  │
│ - UN solo hash (X)                 │
│ - MIME type registrado             │
│ - NO chain of hashes               │
│ - NO transformations               │
└────────────────────────────────────┘
```

**Distancia:**
- **Concepto:** 20% (muy cerca, hash se calcula antes de transformar)
- **Implementación:** 60% (falta registrar transformaciones y chain)
- **Verificador:** 70% (falta entender SmartHash y doble hash)

---

### **🚀 PLAN DE ACCIÓN RECOMENDADO**

#### **FASE 1: SEPARACIÓN SIN ROMPER NADA (1-2 semanas)**

1. **Agregar campos a `user_documents`:**
   ```sql
   ALTER TABLE user_documents
   ADD COLUMN IF NOT EXISTS original_file_type TEXT,
   ADD COLUMN IF NOT EXISTS original_hash TEXT,
   ADD COLUMN IF NOT EXISTS canonical_hash TEXT,
   ADD COLUMN IF NOT EXISTS transformation_log JSONB;
   ```

2. **Actualizar `basicCertificationWeb.ts`:**
   - Agregar `hash_chain` al .ECO
   - Registrar transformaciones en `transformation_log`

3. **Crear función `registerTransformation()`:**
   ```typescript
   async function registerTransformation(
     documentId: string,
     transformation: {
       from_type: string,
       to_type: string,
       from_hash: string,
       to_hash: string,
       method: string,
       timestamp: string
     }
   ): Promise<void>
   ```

#### **FASE 2: CUSTODIA OPCIONAL (2-3 semanas)**

1. **Agregar modo "protección sin custodia":**
   - Solo hash + .ECO (sin subir archivo)
   - Nuevo campo: `custody_mode: 'full' | 'hash_only'`

2. **Actualizar flujo de upload:**
   - Si `custody_mode = 'hash_only'` → no subir archivo
   - Guardar solo hash + metadata en DB

#### **FASE 3: SMARTHASH Y VERIFICADOR (3-4 semanas)**

1. **Implementar SmartHash:**
   ```typescript
   SmartHash = SHA-256(
     original_hash +
     canonical_hash +
     transformations_hash +
     metadata_hash
   )
   ```

2. **Actualizar verificador:**
   - Soportar `hash_chain`
   - Validar transformaciones
   - Mostrar "chain of custody" visual

---

### **📊 MÉTRICAS FINALES**

| Aspecto | Estado Actual | Target "Original + Testigo" |
|---------|---------------|------------------------------|
| Hash antes de transformar | ✅ 100% | ✅ 100% |
| MIME type registrado | ✅ 100% | ✅ 100% |
| Separación original/canónico | ❌ 0% | 🎯 100% |
| Chain of hashes | ❌ 0% | 🎯 100% |
| Transformaciones registradas | ❌ 0% | 🎯 100% |
| Custodia opcional | ⚠️ 50% (E2E existe) | 🎯 100% |
| SmartHash | ❌ 0% | 🎯 100% |
| Verificador avanzado | ⚠️ 30% | 🎯 100% |

**PUNTUACIÓN GLOBAL: 35/100**

Pero el **fundamento está bien** (hash antes de transformar).

Solo falta **hacer explícito lo que ya es implícito**.

---

## 🎯 **RESPUESTAS DIRECTAS A TUS PREGUNTAS**

### **1. ¿Hoy el sistema asume que todo documento es PDF?**

**Respuesta:** Implícitamente **SÍ**, pero técnicamente **NO**.

- ✅ El .ECO registra el MIME type original
- ❌ El código asume PDF en muchos lugares (nombres de campos, flujos de firma)
- ❌ La UI solo acepta PDF (línea 144 de `DocumentUploader.tsx`)

---

### **2. ¿Existe campo `original_file_type`, `source_format` o `mime_type`?**

**Respuesta:**
- ✅ `mime_type` existe en `user_documents` (con DEFAULT `application/pdf`)
- ✅ `mimeType` existe en `.eco → manifest → assets[0].mimeType`
- ❌ NO existe `original_file_type` separado de `mime_type`
- ❌ NO existe `source_format` como campo explícito

---

### **3. ¿El hash se calcula sobre archivo original o PDF normalizado?**

**Respuesta:** **SIEMPRE sobre el archivo ORIGINAL, ANTES de cualquier transformación.**

- ✅ `hashDocument.ts` (línea 18): `file.arrayBuffer()` (sin modificar)
- ✅ `basicCertificationWeb.ts` (línea 301): hash antes de conversión

**Pero:**
- ❌ Si el archivo se convierte de DOCX → PDF, esa transformación NO se registra
- ❌ El hash del PDF convertido NO se guarda como "canonical_hash"

---

### **4. ¿El .ECO tiene `parent_hash` o `source_hash`?**

**Respuesta:** **NO.**

- ❌ Solo hay UN hash en `manifest.assets[0].hash`
- ❌ NO hay campo `parent_hash`, `source_hash` o `hash_chain`

---

### **5. ¿El verificador asume PDF o le da igual?**

**Respuesta:** **Le da igual conceptualmente, pero el código asume PDF.**

- ✅ El .ECO puede registrar cualquier MIME type
- ❌ La UI, el storage y los flujos están orientados a PDF
- ❌ El verificador NO tiene lógica específica para otros formatos

---

## 📝 **ARCHIVOS CLAVE PARA REFACTOR**

```
📂 client/src/
  ├─ utils/
  │   └─ hashDocument.ts            ← Calcular hash original
  ├─ lib/
  │   ├─ basicCertificationWeb.ts   ← Generar .ECO
  │   └─ storage/
  │       └─ encryptedDocumentStorage.ts  ← Upload E2E
  └─ components/documents/
      └─ DocumentUploader.tsx       ← UI de upload

📂 supabase/migrations/
  ├─ 001_core_schema.sql            ← Tabla `documents`
  └─ 20251115220000_007_user_documents.sql  ← Tabla `user_documents`
```

---

## ✅ **CONCLUSIÓN EJECUTIVA**

**Estás MÁS CERCA de lo que pensabas.**

El hash ya se calcula antes de transformaciones.
El .ECO ya registra el MIME type original.

Solo falta:
1. **Hacer explícito** lo que es implícito (separar original/canónico)
2. **Registrar transformaciones** (chain of custody)
3. **Implementar SmartHash** (hash compuesto)
4. **Actualizar verificador** (entender chain)

**Tiempo estimado:** 6-9 semanas para refactor completo.

**Pero puedes empezar YA agregando campos sin romper nada.**

---

**FIN DEL REPORTE**

**Siguiente paso:** ¿Empezamos con Fase 1 (agregar campos) o querés analizar algo más específico?
