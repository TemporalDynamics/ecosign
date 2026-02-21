# Resumen: Flujo de Verificación Presencial (Firma Presencial)

**Versión**: 1.0
**Estado**: Implementado ✅
**Ubicación**: Presential Verification Layer (sin tocar core)

---

## 🎯 ¿Qué es?

Una capa **opcional** que permite que un propietario (owner) de documentos convoque a los firmantes a una **sesión presencial** para:
1. Verificar identidades en tiempo real
2. Confirmar que ven los documentos correctos
3. Generar un acta digital de presencia
4. TODO ESTO SIN requerir que la firma digital sea "presencial" - la firma digital es válida por sí sola

**Posicionamiento clave**: "Tranquilidad compartida", NO "requisito de firma presencial"

---

## 📁 Archivos Creados

### 1. **Migraciones SQL** (2 archivos)

#### `supabase/migrations/20260301_identity_bindings.sql`
- Tabla: `identity_bindings`
- Propósito: Persistencia de identidad (email → UUID)
- Permite trackear personas incluso si cambian email
- Columnas clave:
  - `id` (UUID) - ID persistente de la persona
  - `email` - Email actual
  - `verified_at` - Timestamp de verificación
  - `merged_into_id` - Si dos identidades se unen

#### `supabase/migrations/20260301_presential_verification.sql`
- Tabla: `presential_verification_sessions`
- Propósito: Gestionar sesiones presenciales
- Columnas clave:
  - `session_id` - ID corto (PSV-XXXXX)
  - `operation_id` - Operación que agrupa documentos
  - `qr_code` - Código QR para que signers escaneen
  - `snapshot_hash` - SHA-256 del estado de docs
  - `snapshot_data` - JSONB con docs + signers
  - `confirmations` - JSONB con confirmaciones por signer
  - `status` - active/closed/expired

### 2. **Edge Functions** (3 archivos)

#### `supabase/functions/presential-verification-start-session/index.ts`
**Quién lo usa**: Owner
**Qué hace**:
```
Owner → POST /presential-verification/start-session
  ↓
Sistema captura snapshot (documentos + signers)
  ↓
Genera QR único + session_id (PSV-XXXXX)
  ↓
Retorna: { sessionId, qrCode, snapshotHash }
```

**Input**: `{ operation_id }`
**Output**: `{ sessionId, qrCode, snapshotHash, expiresAt }`

#### `supabase/functions/presential-verification-confirm-presence/index.ts`
**Quién lo usa**: Signer
**Qué hace**:
```
Signer → Escanea QR
  ↓
POST /presential-verification/confirm-presence
  ↓
Sistema valida:
  - Sesión activa
  - Snapshot sin cambios
  - Signer en la operación
  ↓
Verifica identidad (OTP)
  ↓
Crea identity_binding (persistencia)
  ↓
Append event: "identity.session.presence.confirmed"
  ↓
Actualiza session.confirmations
```

**Input**: `{ sessionId, snapshotHash, signerId, email, otp }`
**Output**: `{ status: "confirmed", confirmedAt }`

#### `supabase/functions/presential-verification-close-session/index.ts`
**Quién lo usa**: Owner
**Qué hace**:
```
Owner → POST /presential-verification/close-session
  ↓
Sistema genera acta digital (JSONB record)
  ↓
Calcula SHA-256 del acta
  ↓
Append event: "identity.session.presence.closed"
  ↓
Marca sesión como closed
  ↓
Retorna: { status: "closed", acta, actaHash }
```

**Input**: `{ sessionId }`
**Output**: `{ status: "closed", actaHash, acta }`

### 3. **Documentación**

#### `docs/architecture/PRESENTIAL_VERIFICATION_IMPLEMENTATION.md`
Especificación técnica completa con:
- Esquema de datos (detallado)
- Código de cada endpoint
- Flujos paso a paso
- Ejemplos de curl
- Checklist de aceptación

---

## 👥 Flujo de Usuario

### **ESCENARIO: Owner convoca sesión presencial**

#### **FASE 1: Owner Inicia Sesión** (5 min)

```
1. Owner logged in → Dashboard
2. Selecciona operación (ej: "Venta de inmueble")
3. Hace click: "Iniciar Sesión Presencial"
4. Sistema captura snapshot:
   - Documentos: [escritura, certificados, DNI]
   - Signers: [Vendedor, Comprador, Escribano]
5. Genera QR
6. Muestra:
   ✅ Session ID: PSV-ABC123
   ✅ QR Code (escaneable)
   ✅ Expira en: 30 minutos
   ✅ Personas esperadas: 3
```

#### **FASE 2: Signers Se Presentan** (10-15 min)

```
Signer 1 (Vendedor):
├─ Lee: "Escanea este código para confirmar"
├─ Abre la app → escanea QR
├─ Ve: "¿Es correcto este documento?"
│  [Escritura - Hash ABC123]
│  [Certificados - Hash DEF456]
├─ Ingresa OTP (código enviado por SMS/Email)
├─ Confirma: ✅
├─ Sistema crea identity_binding
├─ Append event: "identity.session.presence.confirmed"
└─ Signer ve: "Confirmado a las 14:32"

Signer 2 (Comprador):
└─ Mismo flujo...

Signer 3 (Escribano):
└─ Mismo flujo...
```

#### **FASE 3: Owner Cierra Sesión** (1 min)

```
Owner → Botón: "Cerrar Sesión"
├─ Sistema genera ACTA:
│  {
│    actId: "ACT-PSV-ABC123",
│    sessionId: "PSV-ABC123",
│    timestamp: "2026-02-21T14:45:00Z",
│    documents: [
│      { name: "Escritura", hash: "ABC123", confirmed: true },
│      { name: "Certificados", hash: "DEF456", confirmed: true }
│    ],
│    signers: [
│      { email: "vendedor@mail.com", confirmedAt: "14:32:15", method: "otp" },
│      { email: "comprador@mail.com", confirmedAt: "14:33:42", method: "otp" },
│      { email: "escribano@mail.com", confirmedAt: "14:34:08", method: "otp" }
│    ],
│    legalNotice: "This presential verification does not modify digital signature validity"
│  }
├─ Calcula hash del acta
├─ Append event: "identity.session.presence.closed"
├─ Marca sesión como CLOSED
└─ Retorna acta + hash para descarga/impresión
```

---

## 🔄 Flujo Técnico Detallado

### **Timeline de Eventos en document_entities.events[]**

```
T0: Firma digital (existing)
└─ event: "document.signed"

T1: Owner inicia presencial
└─ (sesión crea snapshot, NO event aún)

T2: Signer 1 confirma presencia
└─ event: "identity.session.presence.confirmed"
   payload: {
     sessionId: "PSV-ABC123",
     signerId: "uuid-signer-1",
     confirmationMethod: "otp",
     identityBindingId: "persistent-id-1",
     timestampConfirmed: "2026-02-21T14:32:15Z"
   }

T3: Signer 2 confirma presencia
└─ event: "identity.session.presence.confirmed"
   payload: { ... signer 2 ... }

T4: Signer 3 confirma presencia
└─ event: "identity.session.presence.confirmed"
   payload: { ... signer 3 ... }

T5: Owner cierra sesión
└─ event: "identity.session.presence.closed"
   payload: {
     sessionId: "PSV-ABC123",
     actaHash: "SHA256...",
     confirmationsCount: 3,
     closedAt: "2026-02-21T14:45:00Z"
   }
```

---

## 🔐 Seguridad & Constraints

### **Lo que NO toca**

```
✅ No modifica validadores B1-B3
✅ No cambia ECO/ECOX generation
✅ No afecta trigger canónico
✅ No requiere firma digital válida
✅ No bloquea nada (100% opcional)
```

### **Lo que SÍ valida**

```
✅ Sesión activa (no expirada)
✅ Snapshot no cambió (hash verification)
✅ Signer está en la operación
✅ Identidad verificada (OTP)
✅ Eventos append-only
```

---

## 📊 Tabla de Estados

```
┌─────────────────────┬──────────┬─────────────────────────┐
│ Entidad             │ Estado   │ Transiciones            │
├─────────────────────┼──────────┼─────────────────────────┤
│ presential_session  │ active   │ → closed (owner)        │
│                     │ closed   │ (final, immutable)      │
│                     │ expired  │ (timeout 30 min)        │
├─────────────────────┼──────────┼─────────────────────────┤
│ identity_binding    │ active   │ → merged (admin)        │
│                     │ inactive │ (user deleted)          │
└─────────────────────┴──────────┴─────────────────────────┘
```

---

## 🎬 Ejemplo Real: Venta de Inmueble

```
Escenario:
- Vendedor: Juan García
- Comprador: María López
- Escribano: Dr. Rodriguez
- Documentos: Escritura, Cert. Dominio, DNI x3

HORA 14:30
Owner (notaría) → "Iniciar Sesión Presencial"
├─ Genera PSV-VENTA-001
├─ QR generado ✅
└─ Todos ven el QR en la pantalla

HORA 14:32
Juan escanea QR → Ingresa email + OTP → ✅ Confirmado

HORA 14:33
María escanea QR → Ingresa email + OTP → ✅ Confirmada

HORA 14:34
Dr. Rodriguez escanea QR → Ingresa email + OTP → ✅ Confirmado

HORA 14:35
Owner cierra sesión → Acta generada
├─ Acta: "3 personas verificadas presencialmente"
├─ Hash: SHA256 del acta
├─ Descarga PDF del acta
└─ Procede a firma digital (totalmente válida)

RESULTADO:
- Firma digital: ✅ Legalmente válida por sí sola
- Acta presencial: 📄 Evidencia adicional de presencia
- Audit trail: 🔍 Completo en events[]
```

---

## 🚀 Cómo Activar en UI

1. **En Dashboard** → Operación → Botón: "Opciones de Presencia"
2. **Mostrar**:
   - QR Code generado
   - Session ID
   - Lista de confirmaciones
   - Botón: "Cerrar Sesión"
3. **Después de cerrar**:
   - Mostrar acta
   - Opción: "Descargar Acta"
   - Opción: "Compartir Acta"

---

## 💡 Ventajas

```
✅ Identidades verificadas en tiempo real
✅ Prueba de presencia (acta digital)
✅ Audit trail completo
✅ SIN requerir firma presencial obligatoria
✅ Totalmente append-only (immutable)
✅ NO contamina core architecture
✅ Puede agregarse/removerse sin breaking changes
```

---

## 📋 Checklist de Uso

- [ ] Owner logueado
- [ ] Operación con documentos finalizados
- [ ] Al menos 1 signer
- [ ] Internet para escanear QR
- [ ] Email/SMS para recibir OTP
- [ ] 30 minutos para toda la sesión (antes de expiración)
- [ ] Owner disponible para cerrar sesión

---

**Status**: Ready for implementation
**No dependencies**: Completamente desacoplado del core
**Prioridad**: Medium (feature adicional, no bloqueante)
