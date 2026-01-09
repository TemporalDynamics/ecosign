# ARQUITECTURA: Flujo de Firma Multi-Parte

**Estado**: ✅ Backend completado | ⏳ Frontend pendiente
**Fecha**: 2025-11-17

---

## RESUMEN EJECUTIVO

Sistema completo de firma secuencial multi-parte con:
- ✅ Blindaje forense configurable (RFC 3161 + Polygon + Bitcoin)
- ✅ Versionado automático de documentos
- ✅ Solicitud y gestión de modificaciones
- ✅ VerifyTracker integrado para auditoría
- ✅ Sistema de notificaciones completo
- ✅ RLS y seguridad implementada

---

## FLUJO COMPLETO

### FASE 1: Usuario A - Configuración

```
┌─────────────────────────────────────────┐
│  USUARIO A (Propietario)                │
│                                         │
│  1. Carga documento PDF                 │
│  2. Configura blindaje forense:         │
│     ☑ RFC 3161 (ON por defecto)        │
│     ☑ Polygon (ON por defecto)         │
│     ☐ Bitcoin (OFF - lento)            │
│  3. Agrega firmantes:                   │
│     - Email (Smart Paste o manual)      │
│     - Orden de firma (1, 2, 3...)       │
│     - VerifyTracker ON/OFF              │
│     - Login requerido ON/OFF            │
│     - NDA ON/OFF                        │
│  4. Click "Iniciar Flujo"               │
└─────────────────────────────────────────┘
           │
           ▼
    [Edge Function: start-signature-workflow]
           │
           ├─ Crea signature_workflow
           ├─ Crea workflow_version (V1)
           ├─ Crea workflow_signers (todos)
           ├─ Marca primer signer como 'ready'
           └─ Envía notificaciones:
                → Usuario A: "Flujo iniciado"
                → Usuario B (1er firmante): "Tu turno de firmar"
```

### FASE 2: Usuario B - Primera Firma

```
┌─────────────────────────────────────────┐
│  USUARIO B (Primer Firmante)            │
│                                         │
│  1. Recibe email con link seguro        │
│  2. Click en link → /sign/[TOKEN]       │
│  3. Si require_nda:                     │
│     - Modal NDA                         │
│     - Campos: Nombre, Email, Empresa    │
│     - Checkbox: "Acepto NDA"            │
│  4. Ve PDF completo (scroll)            │
│  5. Canvas de firma (bottom fixed)      │
│  6. Click "Firmar y Enviar"             │
└─────────────────────────────────────────┘
           │
           ▼
    [Edge Function: process-signature]
           │
           ├─ Valida token y turno
           ├─ Genera certificación forense:
           │   ├─ RFC 3161 (si enabled)
           │   ├─ Polygon (si enabled)
           │   └─ Bitcoin (si enabled)
           ├─ Guarda en workflow_signatures
           ├─ Marca signer como 'signed'
           ├─ Avanza workflow (siguiente → 'ready')
           └─ Envía notificaciones:
                → Usuario A: "B firmó, email a C"
                → Usuario B: "Tu certificado ECO"
                → Usuario C: "Tu turno de firmar"
```

### FASE 3A: Usuario C - Firma Normal

```
┌─────────────────────────────────────────┐
│  USUARIO C (Segundo Firmante)           │
│                                         │
│  Repite FASE 2                          │
│  → Firma completada                     │
│  → Workflow avanza al siguiente         │
└─────────────────────────────────────────┘
           │
           ▼
    Si no hay más firmantes:
      workflow.status = 'completed'
      Notificar a TODOS con documento final
```

### FASE 3B: Usuario C - Solicita Modificación

```
┌─────────────────────────────────────────┐
│  USUARIO C (Solicita cambios)           │
│                                         │
│  1. En vez de firmar, click             │
│     "Solicitar Modificación"            │
│  2. Modo resaltador activado            │
│  3. Resalta partes del PDF              │
│  4. Long press → Modal de texto         │
│  5. Escribe comentario                  │
│  6. Puede abrir N modales               │
│  7. Click "Enviar Solicitud"            │
└─────────────────────────────────────────┘
           │
           ▼
    [Edge Function: request-document-changes]
           │
           ├─ Valida token y turno
           ├─ Guarda anotaciones en signer.change_request_data
           ├─ signer.status = 'requested_changes'
           ├─ workflow.status = 'paused'
           └─ Envía notificaciones:
                → Usuario A: "C solicita cambios: [lista]"
                → Usuario C: "Solicitud enviada"
                → Usuario B: "Documento pausado, puede haber cambios"
```

### FASE 4: Usuario A - Responde a Modificación

```
┌─────────────────────────────────────────┐
│  USUARIO A (Decide)                     │
│                                         │
│  Dashboard → Ver solicitud de C         │
│                                         │
│  Opción 1: RECHAZAR                     │
│    - Click "Rechazar Cambios"           │
│    - (Opcional) Notas de rechazo        │
│                                         │
│  Opción 2: ACEPTAR                      │
│    - Modifica documento (externo)       │
│    - Sube nueva versión (V2)            │
│    - Click "Aceptar y Reiniciar"        │
└─────────────────────────────────────────┘
           │
           ▼
    [Edge Function: respond-to-changes]
           │
    ┌─────┴─────┐
    │           │
  RECHAZAR   ACEPTAR
    │           │
    │           ├─ Crea workflow_version V2
    │           ├─ Marca V1 como 'superseded'
    │           ├─ Resetea todos signers a 'pending'
    │           ├─ Marca primer signer como 'ready'
    │           └─ Notifica:
    │                → Usuario B: "Nueva versión, firmar de nuevo"
    │                → Usuario C: "Cambios aceptados, espera tu turno"
    │
    └─ signer.status = 'ready'
    └─ workflow.status = 'active'
    └─ Notifica:
         → Usuario C: "Cambios rechazados, firmar original"
```

---

## BASE DE DATOS

### Tablas Principales

#### `signature_workflows`
```sql
id                UUID
owner_id          UUID → auth.users(id)
original_filename TEXT
original_file_url TEXT (Storage)
current_version   INTEGER
status            draft | active | paused | completed | cancelled
forensic_config   JSONB { rfc3161, polygon, bitcoin }
created_at        TIMESTAMPTZ
completed_at      TIMESTAMPTZ
```

#### `workflow_versions`
```sql
id                UUID
workflow_id       UUID → signature_workflows(id)
version_number    INTEGER (1, 2, 3...)
document_url      TEXT (Storage - puede cambiar)
document_hash     TEXT (SHA-256 - único por versión)
change_reason     TEXT "initial" | "modification_by_..."
requested_by      UUID → auth.users(id)
modification_notes JSONB (anotaciones del solicitante)
status            active | superseded | archived
created_at        TIMESTAMPTZ
```

#### `workflow_signers`
```sql
id                  UUID
workflow_id         UUID → signature_workflows(id)
signing_order       INTEGER (1, 2, 3...)
email               TEXT
name                TEXT
require_login       BOOLEAN
require_nda         BOOLEAN
quick_access        BOOLEAN
status              pending | ready | signed | requested_changes | skipped
access_token_hash   TEXT UNIQUE (SHA-256 del token)
first_accessed_at   TIMESTAMPTZ
signed_at           TIMESTAMPTZ
signature_data      JSONB
signature_hash      TEXT
change_request_data JSONB (resaltados, comentarios)
change_request_at   TIMESTAMPTZ
change_request_status pending | accepted | rejected
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

#### `workflow_signatures`
```sql
id                    UUID
workflow_id           UUID → signature_workflows(id)
version_id            UUID → workflow_versions(id)
signer_id             UUID → workflow_signers(id)
signature_image_url   TEXT (Storage)
signature_coordinates JSONB { page, x, y, width, height }
signature_hash        TEXT (SHA-256)
certification_data    JSONB (eco_data completo)
eco_file_url          TEXT (Storage - .ECO)
ecox_file_url         TEXT (Storage - .ECOX si tiene blindaje)
rfc3161_token         TEXT (Token completo si se solicitó)
polygon_tx_hash       TEXT (0x... si se solicitó)
bitcoin_anchor_id     UUID → anchors(id)
ip_address            TEXT
user_agent            TEXT
geo_location          JSONB
signed_at             TIMESTAMPTZ
```

#### `workflow_notifications`
```sql
id                  UUID
workflow_id         UUID → signature_workflows(id)
recipient_email     TEXT
recipient_type      owner | signer | all_signers
signer_id           UUID → workflow_signers(id) (si aplica)
notification_type   workflow_started | your_turn_to_sign |
                    signature_completed | change_requested |
                    change_accepted | change_rejected |
                    new_version_ready | workflow_completed |
                    workflow_cancelled
subject             TEXT
body_html           TEXT
sent_at             TIMESTAMPTZ
delivery_status     pending | sent | delivered | failed | bounced
error_message       TEXT
created_at          TIMESTAMPTZ
```

---

## EDGE FUNCTIONS

### 1. `start-signature-workflow`

**URL**: `/functions/v1/start-signature-workflow`
**Auth**: Required (Usuario A)
**Input**:
```json
{
  "documentUrl": "https://storage.../doc.pdf",
  "documentHash": "abc123...",
  "originalFilename": "Contrato.pdf",
  "signers": [
    {
      "email": "b@example.com",
      "name": "Usuario B",
      "signingOrder": 1,
      "requireLogin": false,
      "requireNda": true,
      "quickAccess": false
    },
    {
      "email": "c@example.com",
      "signingOrder": 2,
      "requireLogin": true,
      "requireNda": true,
      "quickAccess": false
    }
  ],
  "forensicConfig": {
    "rfc3161": true,
    "polygon": true,
    "bitcoin": false
  }
}
```

**Output**:
```json
{
  "success": true,
  "workflowId": "uuid",
  "versionId": "uuid",
  "status": "active",
  "signersCount": 2,
  "firstSignerUrl": "https://app.verifysign.pro/sign/token123",
  "message": "Workflow started. 2 signer(s) added. First signer notified."
}
```

---

### 2. `process-signature`

**URL**: `/functions/v1/process-signature`
**Auth**: NO (usa accessToken)
**Input**:
```json
{
  "accessToken": "token123...",
  "signatureData": {
    "imageUrl": "https://storage.../signature.png",
    "coordinates": {
      "page": 1,
      "x": 100,
      "y": 500,
      "width": 200,
      "height": 50
    }
  },
  "ndaAccepted": true,
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

**Output**:
```json
{
  "success": true,
  "signatureId": "uuid",
  "workflowStatus": "in_progress",
  "nextSigner": {
    "email": "c@example.com",
    "order": 2
  },
  "forensicProof": {
    "rfc3161": true,
    "polygon": true,
    "bitcoin": false
  },
  "message": "Signature recorded. Next signer: c@example.com"
}
```

---

### 3. `request-document-changes`

**URL**: `/functions/v1/request-document-changes`
**Auth**: NO (usa accessToken)
**Input**:
```json
{
  "accessToken": "token456...",
  "annotations": [
    {
      "page": 1,
      "highlights": [
        { "x": 50, "y": 200, "width": 400, "height": 30 }
      ],
      "comment": "Cambiar la fecha de inicio a 2025-02-01"
    },
    {
      "page": 3,
      "highlights": [
        { "x": 100, "y": 400, "width": 300, "height": 20 }
      ],
      "comment": "El monto debe ser $50,000 en vez de $40,000"
    }
  ],
  "generalNotes": "Por favor revisar estas correcciones antes de continuar."
}
```

**Output**:
```json
{
  "success": true,
  "workflowId": "uuid",
  "status": "paused",
  "annotationsCount": 2,
  "message": "Change request submitted. Workflow paused. Owner will be notified."
}
```

---

### 4. `respond-to-changes`

**URL**: `/functions/v1/respond-to-changes`
**Auth**: Required (Usuario A - owner)
**Input** (ACEPTAR):
```json
{
  "workflowId": "uuid",
  "signerId": "uuid-signer-c",
  "action": "accept",
  "newDocumentUrl": "https://storage.../doc-v2.pdf",
  "newDocumentHash": "def456...",
  "modificationNotes": "Cambios aplicados como solicitaste."
}
```

**Input** (RECHAZAR):
```json
{
  "workflowId": "uuid",
  "signerId": "uuid-signer-c",
  "action": "reject",
  "modificationNotes": "Los cambios no son viables en este momento."
}
```

**Output** (ACEPTAR):
```json
{
  "success": true,
  "action": "accepted",
  "newVersion": 2,
  "workflowStatus": "active",
  "message": "Changes accepted. New version created (V2). Workflow restarted."
}
```

**Output** (RECHAZAR):
```json
{
  "success": true,
  "action": "rejected",
  "workflowStatus": "active",
  "message": "Changes rejected. Signer notified. Workflow reactivated."
}
```

---

## FUNCIONES SQL AUXILIARES

### `get_next_signer(workflow_id)`
Retorna el UUID del siguiente signer con `status = 'pending'` en orden.

### `advance_workflow(workflow_id)`
Marca el siguiente signer como `'ready'` o completa el workflow si no hay más.

### `create_workflow_version(...)`
Crea nueva versión, marca anterior como `'superseded'`, resetea signers.

---

## SISTEMA DE NOTIFICACIONES

### Tipos de Email

| Tipo | Destinatario | Cuándo | Contenido |
|------|--------------|--------|-----------|
| `workflow_started` | Usuario A | Al iniciar flujo | Lista de firmantes, primer notificado |
| `your_turn_to_sign` | Signer | Es su turno | Link de firma, explicación certificación |
| `signature_completed` | Signer | Completó firma | Certificado ECO, pruebas forenses |
| `signature_completed` | Usuario A | Cada firma | Progreso del flujo |
| `change_requested` | Usuario A | Signer solicita cambios | Lista de anotaciones |
| `change_requested` | Signer | Envió solicitud | Confirmación de envío |
| `change_requested` | Signers previos | Otro solicita cambios | Aviso de pausa |
| `change_accepted` | Signer | Owner acepta | Nueva versión disponible |
| `change_rejected` | Signer | Owner rechaza | Mantener original |
| `new_version_ready` | Signers previos | Nueva versión | Firmar de nuevo |
| `workflow_completed` | Todos | Última firma | Documento final certificado |

---

## FLUJO DE DATOS: Versionado

```
Workflow creado (V1)
└── Usuario B firma V1 ✓
    └── Usuario C solicita cambios
        ├── Workflow pausado
        ├── Usuario A revisa
        │
        ├─ RECHAZA
        │  └── C firma V1 original
        │      └── Workflow completo
        │
        └─ ACEPTA
           └── Crea V2 (V1 → superseded)
               ├── B firma V2 ✓
               └── C firma V2 ✓
                   └── Workflow completo

Resultado final:
- V1: Firmada parcialmente (B), archivada
- V2: Firmada completa (B + C), activa
- Certificados: Uno por cada firma + uno final
```

---

## PRÓXIMOS PASOS

### Backend (✅ Completado):
1. ✅ Migraciones DB
2. ✅ Edge Functions (4 funciones)
3. ✅ Funciones SQL auxiliares
4. ✅ RLS policies

### Integración Pendiente:
1. ⏳ Resend para envío real de emails
2. ⏳ Recuperación de tokens (para links en emails)
3. ⏳ Storage de firmas e imágenes
4. ⏳ Generación real de .ECO/.ECOX por firma

### Frontend (⏳ Pendiente):
1. ⏳ Componente configurador de firmantes
2. ⏳ Página de firma (`/sign/[token]`)
3. ⏳ Canvas de firma
4. ⏳ Canvas de anotaciones (modificaciones)
5. ⏳ Dashboard de workflows
6. ⏳ Vista de solicitudes de cambios

---

**El backend está listo para empezar a procesar flujos de firma.**
