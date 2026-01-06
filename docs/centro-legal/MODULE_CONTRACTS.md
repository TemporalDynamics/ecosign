# 📋 CONTRATOS DE MÓDULOS — CENTRO LEGAL

**Fecha:** 2026-01-06  
**Propósito:** Definir contratos funcionales ANTES de refactorizar  
**Alcance:** NDA | Protección | Mi Firma | Flujo de Firmas

---

## 🎯 PRINCIPIO GLOBAL (INMUTABLE)

### ❗ Reglas Universales para TODOS los Módulos

```
❌ Ningún módulo crea verdad probatoria
❌ Ningún módulo persiste estado legal
❌ Ningún módulo escribe en events[]

✅ Todo lo probatorio vive FUERA del Centro Legal
✅ Los módulos son Progressive Disclosure
✅ Los módulos son autónomos y encapsulados
```

---

## 📐 ESTRUCTURA CANÓNICA DE UN CONTRATO

Todos los contratos siguen esta estructura:

```
1. Propósito
2. Inputs (qué necesita)
3. Estados internos (UX, NO verdad)
4. Reglas (qué puede/no puede hacer)
5. Outputs / Efectos (qué produce)
6. No-responsabilidades (qué NO hace)
```

---

## 📄 CONTRATO NDA (PRIORIDAD ABSOLUTA)

### 🎯 Propósito

Permitir que un documento esté condicionado legalmente a la **aceptación explícita de un NDA** antes de:
- Acceder al contenido
- Firmar
- Completar un flujo

**Aclaración crítica:**
- El NDA **NO protege el archivo** (eso lo hace el cifrado)
- El NDA **protege el contexto legal del acceso**

---

### 📥 Inputs del Módulo NDA

```typescript
interface NdaModuleInputs {
  documentId: string;
  ndaContent?: string | File;  // Texto plano o PDF
  ndaSource: 'inline-text' | 'uploaded-file' | 'pasted-text';
  ndaRequired: boolean;
  context: 'share-link' | 'signature-flow' | 'internal-review';
}
```

---

### 🧠 Estados Internos (UX, NO Verdad)

```typescript
type NdaPanelState = 'collapsed' | 'expanded';
type NdaEditState = 'editing' | 'viewing';
type NdaValidState = 'valid' | 'invalid';
type NdaSaveState = 'dirty' | 'saved';
```

**📌 Estos estados:**
- NO se guardan en DB
- NO se comparten con otros módulos
- Solo afectan UI local

---

### 📜 Reglas del NDA

#### R1 — Asociación Fuerte

```
Si un documento tiene NDA activo, ese NDA queda asociado al documento,
NO al envío.
```

**Implicaciones:**
- Compartir link → NDA ya está ahí
- Flujo de firmas → NDA ya está ahí
- NO se vuelve a "crear"

---

#### R2 — NDA es Único por Documento

```
NO múltiples NDAs por documento.
Si se reemplaza, se reemplaza completo.
```

---

#### R3 — Formas de Creación del NDA

El módulo DEBE permitir:

1. ✍️ **Editar / pegar texto** (default template o custom)
2. 📎 **Subir archivo** (PDF / DOC / TXT)
3. 🔍 **Buscar contenido** (si es PDF/DOC)
4. 🔎 **Expandir a vista completa** (overlay)

**Comportamiento del Visor NDA:**
- Zoom
- Scroll
- Expandir/colapsar
- Mismo UX que el visor de documento

**📌 El visor del NDA NO es el visor del documento, pero debe comportarse igual**

---

#### R4 — NDA y Experiencia del Receptor

**Cuando un tercero recibe el documento:**

**Paso 1: Pantalla NDA**
```
- Texto completo visible
- Scroll obligatorio (trackear)
- Acción explícita: "Acepto"
```

**Paso 2: Desbloqueo**
```
- Luego de aceptar → siguiente paso (OTP / firma)
- Nunca antes
```

**📌 Reglas adicionales:**
- El NDA **NO se cifra** (es visible antes de OTP)
- El documento **SÍ se cifra** (OTP necesario)

---

#### R5 — NDA en Flujo de Firmas

Si el documento entra en flujo de firmas:

**Cada firmante:**
1. Ve el NDA
2. Debe aceptarlo
3. Solo entonces puede continuar

**La aceptación:**
- Es **previa a OTP**
- Es **previa a firma**

**📌 La aceptación del NDA es parte del contexto legal, NO del acto criptográfico**

---

#### R6 — Orden Inmutable de Pasos

```
NDA → OTP → Acceso al documento → Firma
```

**Nunca:**
- ❌ OTP antes de NDA
- ❌ Firma antes de NDA
- ❌ Acceso antes de NDA

---

### 📤 Outputs del Módulo NDA

```typescript
interface NdaModuleOutputs {
  ndaConfigured: boolean;
  ndaPreview: {
    content: string;
    source: 'inline' | 'file';
    fileName?: string;
  };
  ndaPolicy: {
    requiresAcceptance: boolean;
    appliesTo: ('share' | 'signature')[];
  };
}
```

**Ejemplo de policy:**
```json
{
  "requiresAcceptance": true,
  "appliesTo": ["share", "signature"]
}
```

---

### 🚫 No-Responsabilidades del NDA

El módulo NDA **NO hace:**

- ❌ Cifrar documentos
- ❌ Validar identidad
- ❌ Registrar IP
- ❌ Guardar aceptación probatoria (eso es evento)
- ❌ Decidir niveles de protección

**Eso vive en otras capas.**

---

## 🛡️ CONTRATO PROTECCIÓN

### 🎯 Propósito

Registrar el documento para **verificación futura** (TSA / Anchors).

---

### 📥 Inputs

```typescript
interface ProtectionModuleInputs {
  documentId: string;
  forensicEnabled: boolean;
  forensicConfig: {
    useLegalTimestamp: boolean;  // TSA
    usePolygonAnchor: boolean;   // Polygon
    useBitcoinAnchor: boolean;   // Bitcoin
  };
}
```

---

### 📜 Reglas Clave

#### R1 — Solo si Hay Documento
```
No puede activarse sin documento cargado
```

#### R2 — Activación/Desactivación
```
El usuario puede activar/desactivar en cualquier momento
```

#### R3 — Overlays Informativos
```
Puede mostrar info simple (NO técnica)
```

#### R4 — No Decide Nivel
```
El nivel de protección se DERIVA de events[]
El módulo solo controla la intención
```

**📌 Protección NO depende de NDA, pero pueden coexistir**

---

### 📤 Outputs

```typescript
interface ProtectionModuleOutputs {
  protectionEnabled: boolean;
  forensicConfig: ForensicConfig;
}
```

---

### 🚫 No-Responsabilidades

- ❌ NO escribe eventos TSA
- ❌ NO crea anchors
- ❌ NO calcula protection level
- ❌ NO valida certificados

**Eso lo hace el backend al certificar.**

---

## ✍️ CONTRATO MI FIRMA

### 🎯 Propósito

Permitir que el usuario **prepare su firma** (NO necesariamente estamparla aún).

---

### 📥 Inputs

```typescript
interface MySignatureModuleInputs {
  documentId: string;
  signatureMode: 'canvas' | 'upload' | 'type';
  existingSignature?: {
    imageUrl: string;
    coordinates: { x: number; y: number };
  };
}
```

---

### 📜 Reglas Clave

#### R1 — Modal Flotante
```
Se abre sobre el preview del documento
NO altera el layout del Centro Legal
```

#### R2 — No Firma en Blockchain
```
Este módulo NO ejecuta firma criptográfica
Solo prepara la firma visual
```

#### R3 — No Implica Envío
```
Activar "Mi Firma" NO envía el documento
Solo habilita la capacidad de firmar
```

---

### 📤 Outputs

```typescript
interface MySignatureModuleOutputs {
  signatureReady: boolean;
  signatureData: {
    imageUrl: string;
    coordinates: { x: number; y: number };
  } | null;
}
```

---

### 🚫 No-Responsabilidades

- ❌ NO persiste firma en DB
- ❌ NO crea eventos de firma
- ❌ NO valida identidad del firmante

**📌 "Mi firma" ≠ "Documento firmado"**

---

## 🔁 CONTRATO FLUJO DE FIRMAS

### 🎯 Propósito

Definir **quién firma, en qué orden y bajo qué condiciones**.

---

### 📥 Inputs

```typescript
interface SignatureFlowModuleInputs {
  documentId: string;
  signers: Array<{
    email: string;
    name?: string;
    signingOrder: number;
    requireLogin: boolean;
    requireNda: boolean;
    quickAccess: boolean;
  }>;
}
```

---

### 📜 Reglas Clave

#### R1 — Requiere Documento
```
No puede activarse sin documento
```

#### R2 — Coexistencia
```
Puede coexistir con:
- NDA (cada firmante ve el NDA)
- Protección (el documento se protege)
- Mi Firma (owner puede firmar también)
```

#### R3 — Cada Firmante Recibe
```
1. NDA (si aplica)
2. OTP (siempre)
3. Invitación a firmar
```

#### R4 — Orden Secuencial
```
Los firmantes firman en el orden especificado
No se puede "saltar" el orden
```

---

### 📤 Outputs

```typescript
interface SignatureFlowModuleOutputs {
  flowConfigured: boolean;
  signerCount: number;
  sequentialOrder: boolean;
}
```

---

### 🚫 No-Responsabilidades

- ❌ NO envía emails (eso lo hace backend)
- ❌ NO valida emails en tiempo real
- ❌ NO crea signature_workflows (eso lo hace handleCertify)

**Este módulo solo CONFIGURA el flujo.**

---

## 🎯 ZONA 1 (DROP ZONE) — REGLAS ADICIONALES

### Propósito
Permitir subir documentos de forma **flexible y clara**.

---

### Reglas

#### R1 — Drag & Drop
```
DEBE permitir arrastrar archivos desde el ordenador
```

#### R2 — Tipos de Archivo Aceptados
```
✅ PDF (siempre)
✅ DOC/DOCX
✅ JPG/PNG
✅ TXT
✅ XLS/XLSX
```

#### R3 — Conversión Automática a PDF
```
Si el archivo NO es PDF:
1. EcoSign lo convierte automáticamente
2. Muestra preview del PDF convertido
3. Usuario puede proceder normalmente
```

#### R4 — Advertencia para Firmas Certificadas
```
Si el usuario activa "Firmas Certificadas" (futuro):
  Y el archivo original NO es PDF:
    Mostrar advertencia:
    "Las firmas certificadas solo están disponibles para documentos PDF originales.
     Tu documento fue convertido a PDF por EcoSign."
```

---

## 🧭 CÓMO USAR ESTOS CONTRATOS EN LA REFACTOR

### Paso 1 — Escribir los Contratos (docs/)
```
✅ Uno por módulo
✅ Aunque no estén implementados
✅ Este documento es el contrato base
```

### Paso 2 — Refactorizar Estructura
```
✅ Mover código existente
✅ Sin cambiar comportamiento
✅ Encapsular por módulo
```

### Paso 3 — Validar Contratos vs UI Actual
```
✅ Ver qué falta
✅ Ver qué sobra
✅ Detectar desvíos
```

### Paso 4 — Implementar NDA con Contrato Claro
```
✅ Sin improvisar
✅ Sin mezclar responsabilidades
✅ Siguiendo el contrato al pie de la letra
```

---

## 📊 RESUMEN EJECUTIVO

| Módulo | Estado Actual | Contrato | Prioridad |
|--------|---------------|----------|-----------|
| **NDA** | ❌ Placeholder | ✅ Definido | 🔴 ALTA |
| **Protección** | ✅ Funciona | ✅ Definido | 🟢 Mantener |
| **Mi Firma** | ✅ Funciona | ✅ Definido | 🟢 Mantener |
| **Flujo Firmas** | ✅ Funciona | ✅ Definido | 🟢 Mantener |

---

## 🚫 PROHIBICIONES GLOBALES

Durante la refactorización:

### ❌ NO hacer:
- Crear stores globales
- Mezclar responsabilidades
- Escribir eventos desde módulos
- Cambiar comportamiento existente
- Introducir estados compartidos

### ✅ SÍ hacer:
- Encapsular por módulo
- Mantener contratos claros
- Separar UX de verdad probatoria
- Documentar cambios

---

## 📝 ESTRUCTURA DE CARPETAS PROPUESTA

```
/centro-legal
  /layout
    LegalLayout.tsx          # Orquestador del canvas
    AnchorViewer.tsx         # STEP 1 fijo
    SidePanel.tsx            # Wrapper genérico

  /modules
    /nda
      NdaPanel.tsx
      NdaViewer.tsx
      nda.rules.ts
      nda.copy.ts
      index.ts

    /protection
      ProtectionPanel.tsx
      ProtectionOverlay.tsx
      protection.rules.ts
      protection.copy.ts
      index.ts

    /signature
      MySignaturePanel.tsx
      SignatureModal.tsx
      signature.rules.ts
      index.ts

    /flow
      SignatureFlowPanel.tsx
      flow.rules.ts
      index.ts

  /facts
    legalFacts.ts            # Funciones puras (events → facts)

  /stage
    resolveLegalStage.ts     # Derivación UX (no store)

  CentroLegal.tsx            # Entry point (muy chico)
```

---

## 🎯 PRÓXIMOS PASOS

1. ✅ **Validar estos contratos** con el equipo
2. ✅ **Refactorizar estructura** sin cambiar comportamiento
3. ✅ **Implementar NDA** siguiendo el contrato
4. ✅ **Validar flujo completo** end-to-end

---

**Documento:** Contratos de Módulos — Centro Legal  
**Estado:** CANÓNICO ✅  
**Fecha:** 2026-01-06  
**Próxima revisión:** Post-refactor
