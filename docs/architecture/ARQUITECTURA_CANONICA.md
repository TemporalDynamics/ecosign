# 🏛️ ARQUITECTURA CANÓNICA — ECOSIGN 2026

**Fecha de cierre:** 2026-01-06  
**Estado:** ✅ CERRADO (no se reabre)  
**Versión:** 1.0

> Nota Fase 1:
> Este documento describe arquitectura histórica o conceptual.
> No define autoridad operativa ni eventos canónicos en Fase 1.
> La autoridad de ejecución reside exclusivamente en el Executor.

---

## 🎯 PRINCIPIO FUNDAMENTAL

> "Catalogamos hechos, no documentos"

Todo lo demás deriva de esto.

---

## 🧱 CAPAS ARQUITECTÓNICAS

```
┌─────────────────────────────────────────┐
│  CAPA DE PRESENTACIÓN (UI)              │  ← Centro Legal, Verificador
├─────────────────────────────────────────┤
│  CAPA DE PROYECCIÓN (Derivación)        │  ← protection_level, legal_stage
├─────────────────────────────────────────┤
│  CAPA DE HECHOS (Events)                │  ← events[] (append-only)
├─────────────────────────────────────────┤
│  CAPA DE IDENTIDAD (Continuo L0-L5)     │  ← identity_assurance
├─────────────────────────────────────────┤
│  CAPA DE PROTECCIÓN (TSA/Anchors)       │  ← Forensic timestamps
├─────────────────────────────────────────┤
│  CAPA DE CIFRADO (E2EE)                 │  ← AES-256-GCM + OTP
└─────────────────────────────────────────┘
```

**Regla cardinal:** Las capas superiores NO escriben en las inferiores.

---

## 📜 CONTRATOS CERRADOS

### 1️⃣ EVENTOS (EVENTS[])

**Contrato:**
```typescript
interface Event {
  event: EventType;
  timestamp: ISO8601;
  context: Record<string, any>; // Solo hechos observables
}
```

**Reglas inmutables:**
- ✅ Append-only (nunca UPDATE)
- ✅ Solo hechos verificables
- ✅ No interpretaciones
- ✅ No estados derivados
- ✅ Timestamp obligatorio

**Eventos canónicos:**
```
document_created
document_uploaded
nda_attached
nda_accepted
signature_requested
signature_completed
tsa_timestamp_obtained
anchor_created
access_granted
otp_verified
```

---

### 2️⃣ IDENTIDAD (IDENTITY ASSURANCE)

**Contrato:**
```typescript
interface IdentityAssurance {
  level: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  signals: string[];        // Hechos observables
  provider: 'ecosign' | 'onfido' | 'veriff' | ...;
  method: string;
  timestamp: ISO8601;
}
```

**Reglas inmutables:**
- ✅ Es un continuo (no binario)
- ✅ Nunca bloquea por default
- ✅ Siempre se registra como evento
- ✅ No se "actualiza" (se agrega nueva evidencia)
- ✅ Identidad ≠ Protección ≠ Firma certificada

**Niveles canónicos:**
```
L0 → Anónimo / dispositivo
L1 → Email verificado
L2 → SMS OTP + email
L3 → Documento de identidad (selfie)
L4 → Video liveness + documento
L5 → Presencial + biometría
```

---

### 3️⃣ PROTECCIÓN (FORENSIC CONFIG)

**Contrato:**
```typescript
interface ForensicConfig {
  enabled: boolean;
  tsa: {
    enabled: boolean;
    provider: 'freetsa' | 'digicert' | ...;
  };
  blockchain: {
    enabled: boolean;
    networks: ('polygon' | 'bitcoin')[];
  };
}
```

**Reglas inmutables:**
- ✅ Config ≠ Estado
- ✅ enabled NO escribe eventos
- ✅ Los hechos se escriben cuando ocurren
- ✅ Protection level se deriva, no se persiste

---

### 4️⃣ NDA (NON-DISCLOSURE AGREEMENT)

**Contrato canónico (R1-R6):**

**R1 — Asociación fuerte**
- NDA asociado al documento, no al envío
- Compartir link → NDA ya está
- Flujo de firmas → NDA ya está

**R2 — NDA único por documento**
- No múltiples NDAs
- Si se reemplaza, se reemplaza completo

**R3 — Formas de creación**
- Editar/pegar texto
- Subir archivo (PDF/DOC/TXT)
- Template default

**R4 — Experiencia del receptor**
- Pantalla NDA → Scroll → Aceptar
- Luego desbloqueo de OTP/Firma

**R5 — NDA en flujo de firmas**
- Cada firmante acepta el NDA
- Aceptación previa a firma

**R6 — Orden inmutable**
```
NDA → OTP → Acceso al Documento → Firma
```

**Características técnicas:**
- ❌ NDA NO se cifra (visible antes de OTP)
- ✅ NDA hash se registra en eventos
- ✅ Aceptación es evento probatorio

---

### 5️⃣ FIRMA VISUAL (SIGNATURE STAMPING)

**Contrato:**
```typescript
interface SignatureField {
  id: string;
  type: 'signature' | 'text' | 'date';
  signerId: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value?: string;
}
```

**Reglas inmutables:**
- ✅ Firma visual ≠ Firma probatoria
- ✅ PDF estampado = representación
- ✅ Ledger = verdad
- ✅ Campos = metadata, no eventos
- ✅ Watermark opcional

**Separación de responsabilidades:**
```
FieldPlacer     → UI drag & drop
pdf-stamper.ts  → Motor de estampado
stamp-pdf       → Edge function (backend)
events[]        → Registro probatorio (independiente)
```

---

## 🚫 ANTI-PATRONES (PROHIBIDOS)

### ❌ ANTI-PATRÓN 1: "Actualizar" eventos pasados
```typescript
// ❌ MAL
events[0].identity_level = 'L2'; // PROHIBIDO

// ✅ BIEN
events.push({
  event: 'identity_upgraded',
  timestamp: new Date().toISOString(),
  context: {
    previous_level: 'L1',
    new_level: 'L2',
    evidence: [...]
  }
});
```

---

### ❌ ANTI-PATRÓN 2: Mezclar visual con probatorio
```typescript
// ❌ MAL
signature.stamped = true;
signature.certified = true; // Mezcla visual + legal

// ✅ BIEN
signature_fields: [...],  // Visual (metadata)
events: [
  { event: 'signature_stamped', ... },
  { event: 'signature_certified', ... }
]
```

---

### ❌ ANTI-PATRÓN 3: Estado global en módulos
```typescript
// ❌ MAL (store)
const ndaStore = createStore({ content: '', accepted: false });

// ✅ BIEN (proyección local)
function NdaPanel({ documentId }) {
  const nda = deriveNdaFromEvents(documentId);
  return <NdaViewer content={nda.content} />;
}
```

---

### ❌ ANTI-PATRÓN 4: Flags "mágicos"
```typescript
// ❌ MAL
document.protected = true; // ¿Cuándo? ¿Cómo? ¿Por qué?

// ✅ BIEN
const protection = deriveProtectionState(document.events);
// Proyección desde hechos reales
```

---

## 🧩 MÓDULOS CANÓNICOS

### Centro Legal (Orquestador)
```
/centro-legal/
  ├─ modules/
  │  ├─ protection/   (Protección toggle + info)
  │  ├─ signature/    (Mi firma modal)
  │  ├─ flow/         (Flujo de firmas)
  │  └─ nda/          (NDA panel + upload)
  └─ LegalCenterModalV2.tsx (orquestador)
```

**Responsabilidades:**
- ✅ Mostrar estado (proyectado desde eventos)
- ✅ Capturar intención del usuario
- ✅ Enviar comandos a backend
- ❌ NO escribe eventos
- ❌ NO calcula verdad
- ❌ NO persiste estado legal

---

### Receptor (Gating)
```
/recipient/
  ├─ NdaAcceptanceGate.tsx   (Paso 1)
  ├─ OtpGate.tsx             (Paso 2)
  ├─ DocumentAccess.tsx      (Paso 3)
  └─ SignaturePrompt.tsx     (Paso 4)
```

**Orden canónico (NO SE PUEDE SALTAR):**
```
1. NDA aceptado    → escribe evento
2. OTP verificado  → escribe evento
3. Documento accedido → escribe evento
4. Firma completada → escribe evento
```

---

### Firma Visual (Stamping)
```
/signature/
  ├─ FieldPlacer.tsx         (UI drag & drop)
  └─ pdf-stamper.ts          (Motor)

/supabase/functions/
  └─ stamp-pdf/index.ts      (Edge function)
```

**Responsabilidades:**
- ✅ Posicionar campos visualmente
- ✅ Estampar en PDF
- ✅ Duplicar en todas las páginas
- ❌ NO escribe eventos probatorios
- ❌ NO certifica firmas

---

## 🔐 SECURITY & COMPLIANCE

### Cifrado (E2EE)
```
AES-256-GCM + OTP per-recipient
├─ Documento cifrado en reposo
├─ OTP único por receptor
├─ Clave derivada (PBKDF2)
└─ No hay "clave maestra"
```

### Protección Probatoria
```
TSA (RFC 3161)
├─ Timestamp verificable
├─ Provider: FreeTSA / DigiCert
└─ Independiente de blockchain

Blockchain Anchors
├─ Polygon (default)
├─ Bitcoin (opcional)
└─ Hash del documento + eventos
```

### GDPR
```
├─ Datos mínimos necesarios
├─ Consentimiento explícito (NDA acceptance)
├─ Trazabilidad completa (events[])
├─ Derecho al olvido (soft delete)
└─ Portabilidad (export events[])
```

---

## 📊 MÉTRICAS DE CALIDAD

### Arquitectura
- ✅ Separación de capas respetada
- ✅ Sin stores globales
- ✅ Sin verdad duplicada
- ✅ Append-only real
- ✅ Proyección desde eventos

### Código
- ✅ Módulos < 500 líneas
- ✅ Reglas explícitas (*.rules.ts)
- ✅ Copy desacoplado (*.copy.ts)
- ✅ Contratos claros
- ✅ Sin side effects ocultos

### Producto
- ✅ UX clara (no técnica)
- ✅ Feedback inmediato
- ✅ Nunca se pierde trabajo
- ✅ Orden canónico respetado
- ✅ No promesas legales falsas

---

## 🔮 EVOLUCIÓN FUTURA (PERMITIDA)

### ✅ Qué SÍ puede cambiar:
- UI/UX (mientras proyecte desde eventos)
- Providers (TSA, blockchain, KYC)
- Niveles de identidad (agregar L6, L7...)
- Tipos de campos (firma biométrica, etc.)
- Formatos de documento (no solo PDF)

### ❌ Qué NO puede cambiar:
- Principio append-only
- Separación visual/probatorio
- Orden canónico NDA → OTP → Acceso → Firma
- Eventos como única fuente de verdad
- Identidad como continuo (no binario)

---

## 🏆 ESTADO FINAL

```
✅ Arquitectura cerrada
✅ Contratos inmutables
✅ Módulos encapsulados
✅ Deuda técnica = 0 (oculta)
✅ Deuda explícita documentada
✅ Sin anti-patrones
✅ Escalable sin refactors destructivos
```

**Este documento es canónico. No se reabre.**

---

**Firmado (metafóricamente):**  
Copilot CLI + Manu  
2026-01-06
