# 🎯 BLOQUE 2 — MODELO DEL RECEPTOR / FIRMANTE

**Estado:** ANALYZING → IMPLEMENTING  
**Fecha:** 2026-01-06  
**Prioridad:** ALTA

---

## 📋 OBJETIVO

Cerrar la experiencia del que **recibe** el documento, implementando el orden canónico:

```
NDA → OTP → Acceso → Firma
```

Este bloque **NO toca Centro Legal**.  
Toca:
- ✅ UI de acceso
- ✅ Backend de gating
- ✅ Eventos de aceptación

---

## 🧭 CONTEXTOS DEL RECEPTOR

El receptor puede llegar de 3 formas:

### 1️⃣ Share Link (Compartir documento)
**Ruta:** `/shared/:shareId`  
**Componentes:**
- `SharedDocumentAccessPage.tsx` ✅
- `NDAAcceptanceScreen.tsx` ✅
- `OTPAccessModal.tsx` ✅

**Flujo actual:**
```
1. Si require_nda → NDAAcceptanceScreen
2. acceptNda() → genera evento probatorio
3. OTPAccessModal → desencripta documento
4. Acceso al contenido
```

**Estado:** ✅ IMPLEMENTADO

---

### 2️⃣ Signature Flow (Flujo de firmas)
**Ruta:** `/sign/:token`  
**Componentes:**
- `SignWorkflowPage.tsx` ✅
- `NDAAcceptance.tsx` (step component) ✅
- `SignaturePad.tsx` ✅

**Flujo actual:**
```
1. validating → valida token
2. nda → si require_nda, mostrar NDA
3. otp → MFA TOTP challenge
4. viewing → documento con PDF.js
5. signing → firma con pad o SignNow
6. completed → descarga .ECO
```

**Estado:** ✅ IMPLEMENTADO

---

### 3️⃣ NDA Access (Legacy)
**Ruta:** `/nda/:token`  
**Componente:** `NdaAccessPage.tsx` ✅

**Estado:** ⚠️ LEGACY (convive con los nuevos flujos)

---

## 🔒 ORDEN CANÓNICO (R4, R5, R6)

### ✅ Regla 4: NDA en experiencia del receptor

**Copy actual:**
```
⚠️ Importante: Este documento está protegido por un acuerdo de confidencialidad.
Debes aceptarlo antes de acceder al contenido.
```

**Características:**
- ✅ Scroll obligatorio (UX)
- ✅ Checkbox explícito
- ✅ "Leer acuerdo completo" expandible
- ✅ Mensaje legal: "Tu aceptación quedará registrada..."

**Eventos probatorios generados:**
- Hash del NDA (`SHA-256`)
- Timestamp ISO 8601
- IP del cliente (backend)
- Browser fingerprint (opcional)

---

### ✅ Regla 5: NDA en flujo de firmas

**Comportamiento:**
- Cada firmante ve el NDA individualmente
- Aceptación previa a OTP
- Aceptación previa a firma
- No se puede "saltar" el paso

**Tabla:** `workflow_signers`
```sql
nda_accepted: boolean
nda_accepted_at: timestamp
```

---

### ✅ Regla 6: Orden NDA → OTP → Acceso → Firma

**Validación en código:**

#### Share Link Flow
```typescript
// SharedDocumentAccessPage.tsx (líneas 31-32)
const [ndaAccepted, setNdaAccepted] = useState(false);

// Si NDA requerido:
if (ndaEnabled && !ndaAccepted) {
  return <NDAAcceptanceScreen ... />
}

// Solo después de aceptar:
return <OTPAccessModal ... />
```

#### Signature Flow
```typescript
// SignWorkflowPage.tsx (líneas 33-41)
type SignatureStep =
  | 'validating'
  | 'nda'        // ← ANTES de OTP
  | 'receipt'
  | 'otp'        // ← ANTES de viewing
  | 'viewing'
  | 'signing'
  | 'completed'
```

**Validación:** ✅ El orden es respetado por el state machine

---

## 📊 EVENTOS PROBATORIOS

### Tabla: `nda_acceptances`

**Campos clave:**
```sql
id: uuid
recipient_id: uuid (share-link)
signer_id: uuid (signature-flow)
nda_hash: text (SHA-256 del contenido)
accepted_at: timestamp
ip_address: text
browser_fingerprint: text
link_id: uuid (opcional, para asociar a link específico)
```

### Edge Functions

| Función | Contexto | Estado |
|---------|----------|--------|
| `accept-nda` | Share link (legacy) | ✅ |
| `accept-share-nda` | Share link (E2E) | ✅ |
| `accept-workflow-nda` | Signature flow | ✅ |

### Librería unificada

**Archivo:** `lib/ndaEvents.ts` ✅

```typescript
export async function acceptNda(
  metadata: NdaAcceptanceMetadata
): Promise<NdaAcceptanceResult>
```

**Determina automáticamente:**
- Si es `share-link` → `acceptShareLinkNda()`
- Si es `signature-flow` → `acceptSignatureFlowNda()`

---

## ✅ VALIDACIÓN DE CUMPLIMIENTO

### R4: NDA en experiencia del receptor
- ✅ Pantalla dedicada
- ✅ Scroll obligatorio (UX, no forzado técnicamente)
- ✅ Aceptación explícita
- ✅ Texto completo visible
- ✅ Expandible para NDAs largos

### R5: NDA en flujo de firmas
- ✅ Cada firmante acepta individualmente
- ✅ Previa a OTP
- ✅ Previa a firma
- ✅ No se puede saltar

### R6: Orden NDA → OTP → Acceso → Firma
- ✅ Share link: `ndaAccepted` gate antes de `OTPAccessModal`
- ✅ Signature flow: step `nda` antes de step `otp`
- ✅ No hay código que permita acceso sin NDA si está requerido

---

## 🚧 GAPS DETECTADOS (OPCIONAL)

### 1. Scroll tracking (no implementado)

**Contrato NDA dice:**
> "scroll, nosotros vamos a poder también recuperar esa información como el scroll"

**Estado actual:**  
No se registra el scroll del NDA.

**Decisión:**  
❌ Fuera de scope BLOQUE 2 (tracking avanzado)

---

### 2. OTP por firmante individual

**Contrato NDA dice:**
> "para cada uno de los usuarios una firma OTP específica"

**Estado actual:**  
Share link: OTP único compartible  
Signature flow: Token único por firmante ✅

**Decisión:**  
✅ Signature flow ya cumple  
⚠️ Share link: evaluar si cambiar a OTP por destinatario (FASE posterior)

---

### 3. NDA no se cifra (correcto)

**Contrato NDA dice:**
> "no importa si el NDA no hace falta que el NDA vaya encriptado"

**Validación:**  
✅ `NDAAcceptanceScreen` recibe `ndaText` en claro  
✅ OTP se solicita **después** de aceptar NDA  
✅ Documento encriptado se accede **después** de OTP

---

## 🎯 CRITERIO DE DONE

BLOQUE 2 está completo si:

- ✅ R4 cumplida (NDA experiencia receptor)
- ✅ R5 cumplida (NDA en firma)
- ✅ R6 cumplida (orden canónico)
- ✅ Eventos probatorios generados
- ✅ No hay forma de saltar el orden
- ✅ Copy no técnico
- ✅ UX consistente entre share-link y signature-flow

---

## 📝 PRÓXIMOS PASOS

1. ✅ **Validar flujo end-to-end** (manual QA)
   - Crear documento con NDA
   - Compartir por link
   - Verificar orden NDA → OTP → Acceso
   - Crear flujo de firma con NDA
   - Verificar orden NDA → OTP → Viewing → Firma

2. ⏳ **Copy review** (si es necesario)
   - Verificar que no haya lenguaje técnico
   - Verificar consistencia entre componentes

3. ⏳ **Conectar con Centro Legal** (FASE siguiente)
   - Centro Legal configura NDA
   - Receptor ejecuta el orden canónico
   - Ambos lados sincronizados

---

## 🧠 NOTAS ARQUITECTÓNICAS

### Separación de responsabilidades

**Centro Legal (configuración):**
- Define si require_nda
- Define contenido del NDA
- Define flujo (share / firma)

**Receptor (ejecución):**
- Cumple el orden canónico
- Genera eventos probatorios
- No puede saltar pasos

### Eventos vs. Estado

**Eventos probatorios** (inmutables):
- `nda_acceptances` → append-only
- `ecox_events` → append-only

**Estado derivado** (proyección):
- `workflow_signers.nda_accepted` → flag de progreso
- `document_shares.nda_accepted` → cache de consulta

---

## 🔗 REFERENCIAS

- **Contratos:** `docs/centro-legal/MODULE_CONTRACTS.md`
- **NDA Panel:** `centro-legal/modules/nda/nda.rules.ts`
- **NDA Events:** `lib/ndaEvents.ts`
- **Share Access:** `pages/SharedDocumentAccessPage.tsx`
- **Sign Workflow:** `pages/SignWorkflowPage.tsx`

---

**Última actualización:** 2026-01-06  
**Estado:** ✅ ANÁLISIS COMPLETO — Flujo canónico ya implementado
