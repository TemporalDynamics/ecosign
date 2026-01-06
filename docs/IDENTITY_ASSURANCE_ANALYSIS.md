# 🔐 ANÁLISIS: Identity Assurance Levels en EcoSign

**Fecha:** 2026-01-06  
**Sistema:** EcoSign v1.0  
**Alcance:** Certificación de identidad en firmas digitales

---

## 📊 ESTADO ACTUAL DEL SISTEMA

### 1. Nivel Único Implementado

**HOY el sistema usa UN SOLO nivel de identidad:**

```typescript
// supabase/functions/process-signature/index.ts (línea 121-127)
const identityAssurance = {
  level: 'IAL-1',           // ⚠️ HARDCODED
  provider: 'ecosign',
  method: null,             // ⚠️ No method tracking
  timestamp: signedAt,
  signals: []               // ⚠️ Empty signals array
}
```

**Significado:**
- **IAL-1** = Identity Assurance Level 1 (NIST 800-63)
- **Nivel más bajo** de aseguramiento de identidad
- **Equivalente:** Auto-declaración sin verificación

---

## 🎯 CONTEXTO: ¿QUÉ ES IAL?

### NIST 800-63 Identity Assurance Levels

| Nivel | Descripción | Verificación | Uso Típico |
|-------|-------------|--------------|------------|
| **IAL-1** | Auto-declaración | Ninguna | Foros, newsletters |
| **IAL-2** | Prueba remota | Documento + selfie | Banca digital, KYC básico |
| **IAL-3** | Presencial | Documento físico + biometría | Gobierno, notarías |

**EcoSign HOY:** IAL-1 (sin verificación)

---

## 🔍 DÓNDE SE USA `identity_assurance`

### 1. **Certificación de Firma** ✅
**Archivo:** `supabase/functions/process-signature/index.ts`  
**Línea:** 198

```typescript
const ecoData = {
  certificate_schema_version: CERTIFICATE_SCHEMA_VERSION,
  signer: { email, name, signedAt },
  document: { hash, version },
  signature: { hash, coordinates },
  workflow: { id, signingOrder },
  identity_assurance: identityAssurance,  // ⬅️ AQUÍ
  intent: {...},
  time_assurance: {...},
  environment: {...},
  system_capabilities: {...},
  limitations: [...],
  policy_snapshot_id: 'policy_2025_11',
  event_lineage: {...}
}
```

**Propósito:** Se incluye en el certificado .ECO/.ECOX final

---

### 2. **Verificación de Certificados** ✅
**Archivo:** `supabase/functions/verify-ecox/index.ts`  
**Líneas:** 160, 273-285

```typescript
// Extracción desde archivo .ECO
identityAssurance = ecoData.identity_assurance 
  || ecoData.metadata?.identity_assurance

// Computación para UI
const computedIdentity = {
  level: rawIdentity.level || 'IAL-1',           // ⬅️ Default IAL-1
  provider: rawIdentity.provider || 'ecosign',
  method: rawIdentity.method ?? null,
  timestamp: rawIdentity.timestamp,
  signals: Array.isArray(rawIdentity.signals) ? rawIdentity.signals : [],
  label: 'Estándar'  // UI-friendly label
}
```

**Propósito:** Se muestra en el visor de certificados

---

## 🚨 PROBLEMAS ACTUALES

### 1. **Nivel Único Hardcoded** 🔴
```typescript
level: 'IAL-1'  // Siempre el mismo
```

**Problema:**
- No distingue entre firma con email vs firma con KYC
- No hay diferencia entre guest signer vs usuario verificado
- Todos los certificados tienen el mismo nivel (el más bajo)

**Impacto legal:**
- Certificados NO válidos para contratos de alto valor
- No cumple regulaciones financieras (KYC/AML)
- No sirve para jurisdicciones que requieren IAL-2+

---

### 2. **Signals Vacío** 🟡
```typescript
signals: []  // Nunca se llenan
```

**Problema:**
- No se registra **qué se verificó**
- No hay trazabilidad de la verificación
- No se puede auditar el nivel de confianza

**Debería incluir:**
```typescript
signals: [
  'email_verified',
  'phone_verified',
  'document_provided',
  'selfie_match',
  'liveness_check',
  'address_verified'
]
```

---

### 3. **Method Null** 🟡
```typescript
method: null  // No se registra cómo se verificó
```

**Problema:**
- No distingue entre:
  - Email + OTP
  - Video KYC
  - Documento físico
  - Biometría

**Debería ser:**
```typescript
method: 'email_otp' | 'video_kyc' | 'in_person' | 'biometric'
```

---

### 4. **No Hay Flujo de Upgrade** ⚠️
```typescript
// No existe forma de mejorar el nivel después
```

**Problema:**
- Si un firmante después hace KYC, su firma previa sigue siendo IAL-1
- No hay migración de certificados legacy

---

## 🏗️ ARQUITECTURA ACTUAL

### Flujo de Datos

```
┌─────────────────────────────────────────┐
│  Firmante accede con token              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  signer_links / workflow_signers        │
│  • email                                │
│  • require_nda (boolean)                │
│  • require_login (boolean)              │
│  • quick_access (boolean)               │
│                                         │
│  ⚠️ NO HAY CAMPO identity_level        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  process-signature                      │
│  Hardcoded: IAL-1 para todos            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  workflow_signatures                    │
│  certification_data.identity_assurance  │
│    level: 'IAL-1'                       │
│    signals: []                          │
└─────────────────────────────────────────┘
```

---

## 📋 CAMPOS RELACIONADOS EN DB

### `workflow_signers`
```sql
email TEXT NOT NULL
name TEXT
require_login BOOLEAN DEFAULT false
require_nda BOOLEAN DEFAULT false
quick_access BOOLEAN DEFAULT false
```

**Observación:**
- `require_login` podría mapear a IAL-1.5 (email verificado)
- Pero HOY no se usa para determinar `identity_assurance`

### `signer_links`
```sql
signer_email TEXT NOT NULL
signer_name TEXT
nda_accepted BOOLEAN DEFAULT FALSE
```

**Observación:**
- No hay campo para KYC status
- No hay campo para document verification
- No hay campo para identity level

### `workflow_signatures`
```sql
certification_data JSONB NOT NULL  -- Contiene identity_assurance
```

**Observación:**
- `identity_assurance` está dentro de JSONB
- No indexable
- No queryable directamente

---

## 🔄 POSIBLES MEJORAS

### Opción 1: Niveles Basados en Autenticación 🟢
**Complejidad:** Baja  
**Implementación:** 1-2 días

```typescript
// Derivar nivel desde campos existentes
function determineIdentityLevel(signer) {
  if (signer.require_login && signer.email_verified) {
    return 'IAL-1.5'  // Email verificado
  }
  if (signer.quick_access) {
    return 'IAL-1'    // Solo email
  }
  return 'IAL-1'       // Default
}
```

**Pros:**
- No requiere cambios de schema
- Usa datos existentes
- Backward compatible

**Contras:**
- Solo dos niveles (IAL-1, IAL-1.5)
- No llega a IAL-2

---

### Opción 2: Sistema KYC Completo 🟡
**Complejidad:** Alta  
**Implementación:** 2-4 semanas

```sql
-- Nueva tabla
CREATE TABLE signer_kyc_verifications (
  id UUID PRIMARY KEY,
  signer_id UUID REFERENCES workflow_signers(id),
  level TEXT CHECK (level IN ('IAL-1', 'IAL-2', 'IAL-3')),
  method TEXT,  -- 'video_kyc', 'document_upload', 'in_person'
  signals JSONB,  -- Array de verificaciones realizadas
  document_type TEXT,  -- 'passport', 'dni', 'driver_license'
  document_number TEXT,
  verified_at TIMESTAMPTZ,
  verified_by TEXT,  -- Provider (ej: 'onfido', 'veriff', 'manual')
  verification_result JSONB,
  expires_at TIMESTAMPTZ
);
```

**Pros:**
- Cumplimiento regulatorio real
- Auditable
- Soporte para IAL-2/IAL-3

**Contras:**
- Requiere integración con proveedores KYC
- Costo por verificación
- Complejidad legal/compliance

---

### Opción 3: Modelo Híbrido 🟢
**Complejidad:** Media  
**Implementación:** 1 semana

```typescript
// En workflow_signers
identity_verification_level: 'IAL-1' | 'IAL-1.5' | 'IAL-2'
identity_verification_method: TEXT  // 'email', 'email_otp', 'kyc_provider'
identity_verification_signals: JSONB  // Array de señales
identity_verified_at: TIMESTAMPTZ
```

**Flujo:**
1. **Default:** IAL-1 (sin verificación)
2. **Email + OTP:** IAL-1.5 automático
3. **KYC externo:** IAL-2 (integración futura)

**Pros:**
- Escalable
- Preparado para KYC futuro
- Mejora inmediata sin providers

**Contras:**
- Cambios de schema
- Migración de datos legacy

---

## 🎯 RECOMENDACIÓN

### Implementar Opción 3: Modelo Híbrido

**Fase 1: Inmediato (1-2 días)**
```typescript
// En process-signature/index.ts
const identityAssurance = {
  level: determineLevel(signer),  // IAL-1 o IAL-1.5
  provider: 'ecosign',
  method: signer.require_login ? 'email_otp' : 'email_only',
  timestamp: signedAt,
  signals: buildSignals(signer)  // ['email_verified', 'otp_validated']
}

function determineLevel(signer) {
  if (signer.require_login && signer.nda_accepted) {
    return 'IAL-1.5'  // Email + NDA + Login
  }
  return 'IAL-1'  // Solo email
}

function buildSignals(signer) {
  const signals = ['email_provided']
  if (signer.require_login) signals.push('email_verified')
  if (signer.nda_accepted) signals.push('nda_accepted')
  if (signer.first_accessed_at) signals.push('link_accessed')
  return signals
}
```

**Fase 2: Futuro (cuando se necesite IAL-2)**
- Integración con Onfido/Veriff/Truora
- Tabla `signer_kyc_verifications`
- Upgrade path para certificados legacy

---

## 📊 IMPACTO LEGAL

### Validez según Jurisdicción

| País | IAL-1 ¿Válido? | IAL-2 ¿Requerido? |
|------|----------------|-------------------|
| 🇦🇷 Argentina | ⚠️ Limitado | ✅ Contratos >$10K |
| 🇪🇸 España | ⚠️ Limitado | ✅ eIDAS advanced |
| 🇺🇸 USA | ✅ NDA/SaaS | ⚠️ Regulado (finanzas) |
| 🇧🇷 Brasil | ❌ No válido | ✅ ICP-Brasil requerido |
| 🇲🇽 México | ⚠️ Limitado | ✅ e.firma requerida |

**Conclusión:**
- IAL-1 solo sirve para:
  - NDAs internos
  - Acuerdos SaaS
  - Documentos informativos
- IAL-2+ requerido para:
  - Contratos de alto valor
  - Sector financiero
  - Gobierno

---

## 🔐 COMPLIANCE

### Regulaciones Relevantes

**NIST 800-63-3:**
- IAL-1: Self-asserted attributes
- IAL-2: Remote identity proofing
- IAL-3: In-person identity proofing

**eIDAS (Europa):**
- Simple: ~IAL-1
- Advanced: ~IAL-2
- Qualified: ~IAL-3

**ICP-Brasil:**
- A1/A3: ~IAL-2/IAL-3
- Requiere certificado digital

---

## 📝 SIGUIENTE PASO RECOMENDADO

**Crear contrato canónico:**
```
docs/contratos/IDENTITY_ASSURANCE_RULES.md
```

**Contenido:**
1. Niveles soportados (IAL-1, IAL-1.5, futuro IAL-2)
2. Cómo se determina cada nivel
3. Qué signals se registran
4. Upgrade path
5. Schema changes needed

---

## ✅ RESUMEN EJECUTIVO

**HOY:**
- ✅ Sistema funciona con IAL-1 (auto-declaración)
- ⚠️ No distingue tipos de verificación
- ⚠️ Signals array siempre vacío
- ⚠️ Method siempre null

**MAÑANA (recomendado):**
- ✅ IAL-1.5 para email + OTP
- ✅ Signals poblados correctamente
- ✅ Method tracking implementado
- 🔮 Preparado para IAL-2 (KYC)

**VALOR:**
- Legal compliance mejorado
- Certificados más valiosos
- Auditoría completa
- Upgrade path claro

---

**Generado:** 2026-01-06  
**Autor:** System Analysis (AI-assisted)  
**Revisión requerida:** Tech Lead + Legal
