# SPRINT 5 — IMPLEMENTATION GUIDE

**Status:** IN PROGRESS
**Date:** 2026-01-10
**Phase:** Stamping Integration

---

## CONTEXTO

Sprint 5 implementa el binding real de firma/campos del preview al PDF Witness con eventos canónicos.

**Contrato Backend:** `docs/contratos/SPRINT5_BACKEND_CONTRACT.md`

---

## ✅ LO QUE YA ESTÁ HECHO

### 1. Análisis Completo ✓

**Código existente identificado:**
- `applyOverlaySpecToPdf()` en `client/src/utils/pdfSignature.ts` - Stamping infrastructure completa
- `SignatureField` type en `client/src/types/signature-fields.ts` - Campos con coordenadas en píxeles
- `signatureFields[]` state en `LegalCenterModalV2.tsx` - Gestión de campos
- `signaturePreview` state - Gestión de firma del owner
- Edge Function `save-draft` ya soporta metadata extendida

**Ubicación:**
- `client/src/utils/pdfSignature.ts:94` - función `applyOverlaySpecToPdf()`
- `client/src/components/LegalCenterModalV2.tsx:277` - state `signatureFields`
- `client/src/components/LegalCenterModalV2.tsx:281` - state `signaturePreview`

### 2. Conversión de Coordenadas ✓

**Archivo:** `client/src/utils/overlaySpecConverter.ts`

Funciones implementadas:
```typescript
// Convierte píxeles → normalized (0-1)
normalizeCoordinates(pixelX, pixelY, pixelWidth, pixelHeight, previewW, previewH)

// Convierte SignatureField → OverlaySpecItem
fieldToOverlaySpec(field, previewW, previewH, actor)

// Convierte firma → OverlaySpecItem
signatureToOverlaySpec(signature, page, previewW, previewH, actor)

// Convierte todo a formato backend
convertToOverlaySpec(fields, signature, previewW, previewH, actor)

// Valida coordenadas
validateOverlaySpec(overlays)
```

### 3. Draft Metadata Extendido ✓

**Archivo:** `client/src/lib/draftOperationsService.ts`

```typescript
export interface DraftDocument {
  metadata?: {
    overlay_spec?: unknown[]          // ← NUEVO
    signature_preview?: string         // ← NUEVO
    nda_applied?: boolean             // ← NUEVO
    custody_mode?: 'hash_only' | 'encrypted_custody'
    // ...
  }
}

export async function saveDraftOperation(
  operation,
  files,
  custody_mode = 'hash_only',
  overlay_spec?,                      // ← NUEVO
  signature_preview?,                 // ← NUEVO
  nda_applied?                        // ← NUEVO
)
```

Edge Function ya soporta esto (línea 157 de `save-draft/index.ts`):
```typescript
const draft_metadata = {
  filename: doc.filename,
  size: doc.size,
  ...doc.metadata  // ← Spreads overlay_spec automáticamente
}
```

### 4. Placeholder de Stamping ✓

**Ubicación:** `client/src/components/LegalCenterModalV2.tsx:1089-1127`

Código comentado con TODOs que muestra la integración completa.

---

## ❌ LO QUE FALTA IMPLEMENTAR

### PASO 1: Obtener Dimensiones del Preview PDF

**Problema:** Necesitamos `pdfPreviewWidth` y `pdfPreviewHeight` para calcular coordenadas normalizadas.

**Opciones:**

#### Opción A: Canvas Virtual Fijo (Recomendado)
```typescript
// Dimensiones estándar A4 en puntos PDF (72 DPI)
const PDF_A4_WIDTH = 595;  // 21cm * 72/2.54
const PDF_A4_HEIGHT = 842; // 29.7cm * 72/2.54

// Usar dimensiones fijas para cálculos
const overlaySpec = convertToOverlaySpec(
  signatureFields,
  signaturePreview,
  PDF_A4_WIDTH,
  PDF_A4_HEIGHT
);
```

**Ventaja:** Simple, funciona siempre, independiente del viewport.

#### Opción B: Leer Dimensiones del PDF Real
```typescript
import { getDocument } from 'pdfjs-dist';

async function getPdfDimensions(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.0 });
  return {
    width: viewport.width,
    height: viewport.height
  };
}
```

**Ventaja:** Exacto para PDFs no-A4.

**Recomendación:** Usar Opción A por simplicidad. Opción B para Phase 2 si hay PDFs no-estándar.

---

### PASO 2: Descomentar y Completar Stamping en handleCertify

**Archivo:** `client/src/components/LegalCenterModalV2.tsx`

**Línea:** 1095

**Código a descomentar y completar:**

```typescript
// ANTES del bloque actual
import { convertToOverlaySpec, validateOverlaySpec } from '../utils/overlaySpecConverter';
import { applyOverlaySpecToPdf } from '../utils/pdfSignature';

// En handleCertify, línea 1095:
// ========================================
// SPRINT 5: STAMPING DE OVERLAY_SPEC
// ========================================
let fileToProcess = file;

// PASO 1: Construir overlay_spec si hay campos o firma
const hasOverlays = signatureFields.length > 0 || signaturePreview !== null;

if (hasOverlays) {
  try {
    // Preparar datos de firma para overlay
    const signatureData = signaturePreview && signaturePlacement ? {
      imageUrl: signaturePreview.value,
      x: signaturePlacement.x,
      y: signaturePlacement.y,
      width: signaturePlacement.width,
      height: signaturePlacement.height,
      page: 1 // TODO: Determinar página correcta
    } : null;

    // Convertir a overlay_spec con dimensiones A4 estándar
    const PDF_A4_WIDTH = 595;
    const PDF_A4_HEIGHT = 842;

    const overlaySpec = convertToOverlaySpec(
      signatureFields,
      signatureData,
      PDF_A4_WIDTH,
      PDF_A4_HEIGHT,
      'owner' // Actor siempre es 'owner' en flujo individual
    );

    // Validar overlay_spec
    if (!validateOverlaySpec(overlaySpec)) {
      throw new Error('Coordenadas de overlay inválidas');
    }

    console.log('📐 Overlay spec generado:', overlaySpec);

    // PASO 2: Aplicar stamping al PDF
    setCertifyProgress({
      stage: 'preparing',
      message: 'Estampando firma y campos en PDF...'
    });

    const stampedBlob = await applyOverlaySpecToPdf(file, overlaySpec);
    fileToProcess = new File([stampedBlob], file.name, { type: 'application/pdf' });

    console.log('✅ Stamping aplicado al PDF');

    // PASO 3: Calcular hash del PDF estampado (NUEVO witness_hash)
    const stampedHash = await hashWitness(await fileToProcess.arrayBuffer());

    // PASO 4: Agregar evento signature.applied al transform log
    if (canonicalDocumentId) {
      await appendTransform(canonicalDocumentId, {
        from_mime: 'application/pdf',
        to_mime: 'application/pdf',
        from_hash: canonicalSourceHash || stampedHash,
        to_hash: stampedHash,
        method: 'client',
        reason: 'signature_applied',
        executed_at: new Date().toISOString(),
        metadata: {
          overlay_spec: overlaySpec,
          actor: 'owner',
          signature_type: signatureType
        }
      });

      console.log('✅ Transform log: signature.applied registrado');
    }

    // PASO 5: Actualizar witness_hash ANTES de continuar
    // CRÍTICO: El hash DEBE incluir el PDF estampado
    if (canonicalDocumentId) {
      await ensureWitnessCurrent(canonicalDocumentId, {
        hash: stampedHash,
        mime_type: 'application/pdf',
        storage_path: '',
        status: 'generated'
      });

      console.log('✅ Witness hash actualizado con stamping:', stampedHash);
    }

  } catch (stampError) {
    console.error('❌ Error aplicando stamping:', stampError);
    toast.error('Error al estampar firma/campos en el PDF. Continuando sin stamping.');
    // Continuar sin stamping (fallback)
  }
}
// ========================================
```

---

### PASO 3: Testing de Stamping

**Casos de prueba:**

1. **Solo firma (sin campos)**
   - Crear firma en SignatureModal
   - Proteger documento
   - Verificar que firma aparece en PDF descargado

2. **Solo campos (sin firma)**
   - Crear campo de texto
   - Crear campo de fecha
   - Proteger documento
   - Verificar que campos aparecen en PDF descargado

3. **Firma + campos**
   - Crear firma
   - Crear 2-3 campos
   - Proteger documento
   - Verificar que todo aparece correctamente posicionado

4. **Múltiples páginas**
   - Documento de 3+ páginas
   - Agregar campos en páginas diferentes
   - Verificar posicionamiento correcto por página

5. **Transform log**
   - Verificar que evento `signature.applied` se registra
   - Verificar metadata incluye overlay_spec
   - Verificar timestamps UTC correctos

6. **Hash chain**
   - Verificar que witness_hash se calcula DESPUÉS de stamping
   - Verificar que witness_hash incluye contenido estampado
   - Comparar hash antes/después de stamping (deben ser diferentes)

---

### PASO 4: Integración con Draft Operations (Opcional)

**Archivo:** `client/src/components/LegalCenterModalV2.tsx`

**Objetivo:** Guardar overlay_spec cuando el usuario guarda un draft.

```typescript
// Cuando se guarda draft (función a crear)
const handleSaveDraft = async () => {
  if (!file) return;

  // Construir overlay_spec actual
  const overlaySpec = convertToOverlaySpec(
    signatureFields,
    signaturePreview ? { ...signaturePlacement, imageUrl: signaturePreview.value, page: 1 } : null,
    595, // A4 width
    842  // A4 height
  );

  // Guardar draft con overlay_spec
  await saveDraftOperation(
    { name: file.name, description: 'Borrador guardado' },
    [file],
    custodyModeChoice,
    overlaySpec.length > 0 ? overlaySpec : undefined,
    signaturePreview?.value || undefined,
    ndaEnabled
  );

  toast.success('Borrador guardado con firma y campos');
};
```

---

### PASO 5: Restaurar Draft con Overlay_Spec (Opcional)

**Objetivo:** Cuando el usuario carga un draft, restaurar `signatureFields` y `signaturePreview` desde `overlay_spec`.

```typescript
// Función de conversión inversa
function overlaySpecToFields(
  overlaySpec: OverlaySpecItem[],
  pdfWidth: number,
  pdfHeight: number
): { fields: SignatureField[], signature: SignatureData | null } {
  const fields: SignatureField[] = [];
  let signature: SignatureData | null = null;

  for (const overlay of overlaySpec) {
    if (overlay.kind === 'signature') {
      // Reconstruir firma
      signature = {
        imageUrl: overlay.value,
        coordinates: {
          x: overlay.x * pdfWidth,
          y: overlay.y * pdfHeight
        }
      };
    } else {
      // Reconstruir campo
      const field: SignatureField = {
        id: crypto.randomUUID(),
        type: overlay.kind === 'field_signature' ? 'signature' :
              overlay.kind === 'field_text' ? 'text' : 'date',
        page: overlay.page,
        x: overlay.x * pdfWidth,
        y: overlay.y * pdfHeight,
        width: overlay.w * pdfWidth,
        height: overlay.h * pdfHeight,
        value: overlay.value,
        required: overlay.required,
        metadata: {
          normalized: {
            x: overlay.x,
            y: overlay.y,
            width: overlay.w,
            height: overlay.h
          }
        }
      };
      fields.push(field);
    }
  }

  return { fields, signature };
}
```

---

## CHECKLIST DE VALIDACIÓN (Contrato)

Antes de dar por terminado Sprint 5, verificar:

### Persistencia
- [ ] `overlay_spec` guardado en `draft_metadata` ✓ (interfaces extendidas)
- [ ] `signaturePreview` guardado (si aplica) ✓ (interfaces extendidas)
- [ ] NDA persistido correctamente ✓ (interfaces extendidas)

### Stamping
- [ ] Witness Base generado sin overlays ⏳ (TODO)
- [ ] Overlays estampados en PDF (no CSS) ⏳ (TODO)
- [ ] Coordenadas normalizadas → píxeles correctos ⏳ (TODO)
- [ ] Firma visible en PDF final ⏳ (TODO)

### Hash Chain
- [ ] `witness_hash` calculado DESPUÉS de stamping ⏳ (TODO)
- [ ] Hash incluye firma estampada ⏳ (TODO)
- [ ] `hash_chain` completo (source → witness) ✓ (ya existe)

### Transform Log
- [ ] Evento `signature.applied` registrado ⏳ (TODO)
- [ ] Metadata incluye `overlay_spec` ⏳ (TODO)
- [ ] Timestamp UTC correcto ⏳ (TODO)

### Eventos Canónicos
- [ ] `document.created` ✓ (ya existe)
- [ ] `nda.applied` ✓ (ya existe)
- [ ] `signature.applied` ⏳ (TODO)
- [ ] `witness.generated` ✓ (ya existe)
- [ ] `tsa` ✓ (ya existe)
- [ ] `anchor` (Polygon) ✓ (ya existe)
- [ ] `ecosign.attested` ✓ (ya existe)

---

## NOTAS TÉCNICAS

### Coordenadas Normalizadas (0-1)

**Importante:** Las coordenadas normalizadas son RELATIVAS al tamaño de página PDF real, NO al viewport del preview.

```
Normalizado:    0.0 ← → 1.0
PDF Real:       0px ← → 595px (A4 width)
Preview:        0px ← → ???px (variable según zoom)
```

**Conversión correcta:**
```typescript
normalized_x = pixel_x / PDF_REAL_WIDTH  // NO preview width
```

### Sistema de Coordenadas PDF

PDF usa coordenadas con origen en **bottom-left**, no top-left como HTML.

```
HTML (top-left):        PDF (bottom-left):
(0,0) -----> X          Y ↑
  |                       |
  ↓ Y                     |
                    (0,0) -----> X
```

La función `applyOverlaySpecToPdf()` ya maneja esta conversión:
```typescript
const bottom = pageHeight - (overlay.y * pageHeight) - height;
```

### Hash Chain Timing

**CRÍTICO:** El orden es:

```
1. file.pdf (source)
   ↓ hash → source_hash
2. applyOverlaySpecToPdf() → stamped.pdf
   ↓ hash → witness_hash (INCLUYE stamping)
3. addSignatureSheet() → witness_with_sheet.pdf
   ↓ (opcional, no re-hashea)
4. certifyFile() → certified.pdf
   ↓ hash → signed_hash
```

**NUNCA hashear antes del stamping.**

---

## REFERENCIAS

- `SPRINT5_BACKEND_CONTRACT.md` - Contrato técnico-legal
- `DOCUMENT_ENTITY_CONTRACT.md` - Modelo canónico
- `WITNESS_PDF_CONTRACT.md` - Reglas del PDF Witness
- `client/src/utils/pdfSignature.ts` - Stamping infrastructure
- `client/src/utils/overlaySpecConverter.ts` - Coordinate conversion
- `client/src/lib/draftOperationsService.ts` - Draft persistence

---

**Última actualización:** 2026-01-10
**Siguiente paso:** Descomentar código en `handleCertify` y probar stamping end-to-end
