# 📊 BLOQUE 2 — ANÁLISIS DEL FLUJO DEL RECEPTOR

**Fecha:** 2026-01-06  
**Estado:** ANALYSIS  
**Objetivo:** Cerrar experiencia del receptor implementando NDA → OTP → Acceso → Firma

---

## 🔍 ESTADO ACTUAL (LO QUE YA EXISTE)

### ✅ Componentes Implementados

#### 1. **SharedDocumentAccessPage** (`/shared/:shareId`)
**Archivo:** `client/src/pages/SharedDocumentAccessPage.tsx`

**Flujo actual:**
```
1. Fetch share data (document_shares table)
2. Check if NDA enabled
3. IF NDA → Show NDAAcceptanceScreen
4. ELSE → Show OTPAccessModal directly
```

**Estado:** ✅ Funcional pero **NO cumple R4 completamente**

**Problema:**
- NDA y OTP son independientes
- No valida orden estricto NDA → OTP
- No registra eventos probatorios de aceptación NDA


#### 2. **NDAAcceptanceScreen**
**Archivo:** `client/src/components/NDAAcceptanceScreen.tsx`

**Features:**
- ✅ Muestra NDA text
- ✅ Checkbox de aceptación
- ✅ Botones Aceptar/Rechazar
- ✅ Preview + expandible

**Problema:**
- ❌ No registra timestamp de aceptación
- ❌ No registra IP/user-agent
- ❌ No genera evento probatorio
- ❌ No hashea el NDA aceptado
- ❌ Solo cambia estado local (`setNdaAccepted(true)`)


#### 3. **OTPAccessModal**
**Archivo:** `client/src/components/OTPAccessModal.tsx`

**Features:**
- ✅ Input OTP
- ✅ Validación OTP
- ✅ Decryption + download
- ✅ Progress bar

**Estado:** ✅ Funcional

**Problema:**
- ❌ No verifica que NDA fue aceptado previamente
- ❌ Puede llamarse directamente (bypass NDA)


#### 4. **SignWorkflowPage** (`/sign/:token`)
**Archivo:** `client/src/pages/SignWorkflowPage.tsx`

**Flujo actual:**
```typescript
type SignatureStep =
  | 'validating'   // Valida token
  | 'nda'          // NDA (si aplica)
  | 'receipt'      // Datos del firmante
  | 'otp'          // OTP challenge
  | 'viewing'      // Ver documento
  | 'signing'      // Firmar
  | 'completed'    // Descarga
  | 'error'
```

**Estado:** ✅ Orden implementado correctamente

**Características:**
- ✅ Sequential gating (uno tras otro)
- ✅ NDA antes de OTP
- ✅ OTP antes de viewing
- ✅ Viewing antes de signing
- ✅ ECOX logging en cada paso

**Lo que falta:**
- ⏳ Registro probatorio de NDA acceptance (como evento)
- ⏳ Hash del NDA aceptado
- ⏳ Unificar flujos (share vs signature flow)

---

## 🎯 GAPS A CERRAR (BLOQUE 2)

### Gap 1: NDA Acceptance NO es probatoria

**Problema:**
```typescript
// Actual (NDAAcceptanceScreen.tsx, línea 125)
onClick={onAccept}  // Solo callback, sin registro
```

**Solución requerida:**
```typescript
onClick={async () => {
  // 1. Registrar evento probatorio
  await registerNDAAcceptance({
    shareId,
    ndaHash: hashNDA(ndaText),
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    ip: await getClientIP(),
  });
  
  // 2. Luego permitir continuar
  onAccept();
}}
```

**Eventos a crear:**
- `nda_accepted` (en events[])
- `nda_rejected` (opcional, para auditoría)


### Gap 2: No hay gating estricto NDA → OTP

**Problema:**
En `SharedDocumentAccessPage`, el flujo es:
```typescript
if (ndaEnabled && !ndaAccepted) {
  return <NDAAcceptanceScreen />;
}

// Si ndaAccepted = true localmente, pasa directo
return <OTPAccessModal />;
```

**Riesgo:**
- Un usuario técnico podría manipular `ndaAccepted` en memoria
- No hay verificación server-side

**Solución:**
```typescript
// Backend debe guardar estado de aceptación NDA
// OTP solo puede validarse si existe evento nda_accepted previo
```


### Gap 3: Eventos de receptor no se registran canónicamente

**Problema:**
Los eventos del receptor (NDA acceptance, OTP validation, acceso) no generan entries en `events[]` del documento.

**Solución:**
Cada acción debe generar evento:
```typescript
{
  type: 'nda_accepted',
  actor: recipient_email,
  timestamp: ISO8601,
  data: {
    nda_hash: sha256(ndaText),
    share_id: shareId,
    ip: clientIP,
    user_agent: navigator.userAgent
  }
}
```


### Gap 4: Unificación de flujos

**Problema:**
Hay 2 flujos separados:
1. `SharedDocumentAccessPage` (compartir documento)
2. `SignWorkflowPage` (flujo de firmas)

Ambos tienen lógica similar pero duplicada.

**Oportunidad:**
- Extraer lógica común
- Crear componente reutilizable `RecipientFlowGate`
- Un solo contrato de orden canónico


---

## 📋 PLAN DE ACCIÓN — BLOQUE 2

### Fase 2.1 — Eventos Probatorios de NDA (CRÍTICO)

**Objetivo:** Que la aceptación del NDA genere eventos verificables

**Archivos a modificar:**
1. `client/src/components/NDAAcceptanceScreen.tsx`
   - Agregar `onAccept` async
   - Llamar a `registerNDAEvent()`

2. Crear `client/src/lib/ndaEvents.ts`
   ```typescript
   export async function registerNDAAcceptance(params: {
     shareId: string;
     ndaText: string;
     recipientEmail: string;
   }): Promise<void> {
     // Hash NDA
     const ndaHash = await hashText(ndaText);
     
     // Get metadata
     const metadata = {
       timestamp: new Date().toISOString(),
       userAgent: navigator.userAgent,
       // IP se obtiene en backend
     };
     
     // Call backend endpoint
     await fetch('/api/nda/accept', {
       method: 'POST',
       body: JSON.stringify({
         shareId,
         ndaHash,
         metadata
       })
     });
   }
   ```

3. Backend: crear endpoint `/api/nda/accept`
   - Valida shareId
   - Registra evento en DB
   - Agrega evento a `events[]` del documento (si forensic)


### Fase 2.2 — Gating Estricto (SEGURIDAD)

**Objetivo:** OTP solo funciona si NDA fue aceptado (cuando aplica)

**Cambios:**

1. `OTPAccessModal` debe verificar pre-condición:
   ```typescript
   useEffect(() => {
     if (ndaRequired && !ndaAcceptedInDB) {
       setError('Debes aceptar el NDA primero');
       onClose();
     }
   }, []);
   ```

2. Backend: endpoint OTP validation
   ```typescript
   // En accessSharedDocument()
   if (share.nda_enabled) {
     const ndaEvent = await checkNDAAccepted(shareId, recipientEmail);
     if (!ndaEvent) {
       throw new Error('NDA not accepted');
     }
   }
   ```


### Fase 2.3 — Unificar Flujos (REFACTOR)

**Objetivo:** Un solo componente `RecipientFlowOrchestrator`

**Estructura:**
```
/recipient-flow/
  RecipientFlowOrchestrator.tsx   # Orquestador principal
  /steps/
    NDAStep.tsx                    # Paso 1: NDA (si aplica)
    OTPStep.tsx                    # Paso 2: OTP
    ViewStep.tsx                   # Paso 3: Ver doc
    SignStep.tsx                   # Paso 4: Firmar (si aplica)
    CompleteStep.tsx               # Paso 5: Descarga
  /gates/
    ndaGate.ts                     # Regla: NDA → OTP
    otpGate.ts                     # Regla: OTP → View
    signGate.ts                    # Regla: View → Sign
  recipient.rules.ts               # R4, R5, R6 como código
```


### Fase 2.4 — UI/UX del Receptor

**Objetivo:** Mostrar claramente el progreso del flujo

**Componente nuevo:**
```typescript
<RecipientProgress
  steps={[
    { label: 'NDA', status: 'completed' },
    { label: 'Verificación', status: 'current' },
    { label: 'Documento', status: 'pending' },
    { label: 'Firma', status: 'pending' },
  ]}
/>
```

**Ubicación:**
- Top de `SharedDocumentAccessPage`
- Top de `SignWorkflowPage`


---

## 🧭 ORDEN DE EJECUCIÓN RECOMENDADO

### Semana 1 — Fundamentos Probatorios
```
✅ Fase 2.1 — Eventos de NDA
   └─ Crítico: sin esto, R4 no se cumple
   
⏳ Fase 2.2 — Gating estricto
   └─ Seguridad: evita bypass
```

### Semana 2 — Refinamiento UX
```
⏳ Fase 2.4 — UI Progress
   └─ UX: usuario ve dónde está
   
⏳ Fase 2.3 — Unificación (si hay tiempo)
   └─ Refactor: reduce duplicación
```

---

## ✅ DEFINICIÓN DE DONE — BLOQUE 2

BLOQUE 2 está completo cuando:

✅ Aceptación de NDA genera evento probatorio (hash + timestamp + IP)

✅ OTP solo funciona si NDA fue aceptado (cuando aplica)

✅ Orden NDA → OTP → Acceso es **enforced**, no sugerido

✅ Usuario ve progress bar de flujo

✅ Eventos del receptor están en `events[]` canónicos

✅ Tests manuales:
  - Compartir con NDA → recipient acepta → OTP → descarga
  - Compartir sin NDA → OTP → descarga
  - Flujo firmas: NDA → OTP → view → sign → complete

---

## 🚫 FUERA DE SCOPE (BLOQUE 2)

❌ **NO tocar:**
- Firma visual (BLOQUE 3)
- Campos de firma (BLOQUE 3)
- PDF Witness (BLOQUE 4)
- Identidad avanzada (posterior)
- Certificados TSA en firma (posterior)

✅ **SOLO:**
- Experiencia del receptor
- Gating NDA → OTP → Acceso
- Eventos probatorios de receptor
- UI de progreso

---

## 📌 CONTRATOS A CUMPLIR

### R4 — NDA y experiencia del receptor

**De MODULE_CONTRACTS.md:**
```
Cuando un tercero recibe el documento:

1️⃣ Pantalla NDA
   - Texto completo
   - Scroll obligatorio
   - Acción explícita: "Acepto"

2️⃣ Desbloqueo del paso siguiente (OTP / firma)
   - Nunca antes
```

**Estado actual:** ⚠️ Parcialmente implementado
**Gap:** No hay registro probatorio de aceptación


### R5 — NDA en flujo de firmas

**De MODULE_CONTRACTS.md:**
```
Si el documento entra en flujo de firmas:

- Cada firmante:
  - ve el NDA
  - debe aceptarlo

- La aceptación:
  - es previa a OTP
  - es previa a firma
```

**Estado actual:** ✅ SignWorkflowPage lo implementa correctamente
**Gap:** Falta evento probatorio


### R6 — Relación con OTP / cifrado

**De MODULE_CONTRACTS.md:**
```
Orden inmutable:

NDA → OTP → Acceso al documento → Firma

Nunca:
- OTP antes de NDA
- Firma antes de NDA
```

**Estado actual:** ⚠️ Sugerido en UI, no enforced en backend
**Gap:** Gating server-side

---

## 🎯 SIGUIENTE PASO INMEDIATO

**Comenzar con Fase 2.1 — Eventos Probatorios de NDA**

Razones:
1. Es el gap más crítico (sin esto, R4 no se cumple)
2. Es auto-contenido (no depende de otros cambios)
3. Es de bajo riesgo (solo agrega, no modifica)
4. Habilita el resto de las fases

**Estimación:** 1-2 días

**Archivos a crear:**
- `client/src/lib/ndaEvents.ts`
- Backend: endpoint `/api/nda/accept` (Edge Function)

**Archivos a modificar:**
- `client/src/components/NDAAcceptanceScreen.tsx` (agregar registro)
- `client/src/pages/SharedDocumentAccessPage.tsx` (pasar callbacks)

---

## 📊 MÉTRICAS DE ÉXITO

Al finalizar BLOQUE 2, deberíamos poder responder SÍ a:

✅ ¿Un receptor puede aceptar NDA y queda registrado?  
✅ ¿El OTP falla si no aceptó NDA (cuando aplica)?  
✅ ¿Los eventos del receptor están en events[] del documento?  
✅ ¿El usuario ve claramente en qué paso está?  
✅ ¿El orden NDA → OTP → Acceso es inmutable?

Si falla uno → BLOQUE 2 no está completo.

