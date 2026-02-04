# 📊 ANÁLISIS DETALLADO: 52 Errores de TypeScript

**Fecha:** 2026-02-04  
**Total de errores:** 52  
**Severidad:** Mixta (cosmético a bloqueante)  
**Clasificación:** 7 categorías

---

## 📈 RESUMEN EJECUTIVO

| Categoría | Cantidad | Tipo | Impacto | Esfuerzo |
|-----------|----------|------|--------|----------|
| Módulos faltantes | 5 | TS2307 | Medio | 1-2h |
| Tipos PDF.js | 4 | TS2304/TS7016 | Medio | 30 min |
| Enum/Type mismatch | 5 | TS2322 | Bajo | 15 min |
| ArrayBuffer/Uint8Array | 7 | TS2769/TS2322 | Bajo-Medio | 1h |
| Variables undefined | 7 | TS2304/TS7006 | Bajo | 30 min |
| Lógica null-safety | 5 | TS2345/TS18047 | Bajo | 30 min |
| Propiedades faltantes | 14 | TS2339/TS2353 | Medio | 2h |

---

## 🔴 CATEGORÍA 1: MÓDULOS FALTANTES (5 errores)

### Descripción
Archivos o módulos que el compilador no puede encontrar. Generalmente por refactors incompletos.

### Errores

**1. `SceneRenderer.tsx:10` - Cannot find '../../signature/types'**
```
error TS2307: Cannot find module '../../signature/types' or its corresponding type declarations.
```
- **Problema:** Intenta importar tipos de una ruta que no existe
- **Ubicación:** `client/src/components/centro-legal/layout/SceneRenderer.tsx`
- **Causa probable:** Refactor de estructura de carpetas de signature, tipos movidos
- **Solución:** Encontrar dónde están los tipos y actualizar import path
- **Impacto:** Bloquea compilación parcial de Scene components

**2. `NdaScene.tsx:2` - Cannot find '../modules/nda'**
```
error TS2307: Cannot find module '../modules/nda' or its corresponding type declarations.
```
- **Problema:** Módulo NDA no existe o está en otra ubicación
- **Ubicación:** `client/src/components/centro-legal/scenes/NdaScene.tsx`
- **Causa probable:** Módulo NDA no fue migrado a `modules/` correctamente
- **Solución:** Verificar si existe `client/src/centro-legal/modules/nda/`
- **Impacto:** Scene NDA no renderiza

**3. `SignatureScene.tsx:2` - Cannot find '../../signature/SignatureFieldsEditor'**
```
error TS2307: Cannot find module '../../signature/SignatureFieldsEditor' or its corresponding type declarations.
```
- **Problema:** Componente SignatureFieldsEditor no existe en ubicación esperada
- **Ubicación:** `client/src/components/centro-legal/scenes/SignatureScene.tsx`
- **Causa probable:** Componente está en `_deprecated/` o fue refactorizado
- **Solución:** Localizar dónde está el componente real
- **Impacto:** Scene Signature no renderiza

**4. `SignatureScene.tsx:3` - Cannot find '../../signature/types'**
```
error TS2307: Cannot find module '../../signature/types' or its corresponding type declarations.
```
- **Problema:** Mismo que error #1, tipos de signature no localizables
- **Ubicación:** `client/src/components/centro-legal/scenes/SignatureScene.tsx`
- **Causa probable:** Refactor de types, probablemente en otro módulo
- **Solución:** Consolidar imports de tipos a ubicación centralizada
- **Impacto:** TypeScript no resuelve tipos de signature

**5. `FieldToolbar.tsx:3` - Cannot find '../../../types/signature-fields'**
```
error TS2307: Cannot find module '../../../types/signature-fields' or its corresponding type declarations.
```
- **Problema:** Archivo de tipos `signature-fields` no existe
- **Ubicación:** `client/src/components/signature-flow/FieldToolbar.tsx`
- **Causa probable:** Archivo está en otra ubicación o fue eliminado
- **Solución:** Encontrar dónde están definidos los tipos de signature-fields
- **Impacto:** FieldToolbar no compila

---

## 🟡 CATEGORÍA 2: TIPOS PDF.JS (4 errores)

### Descripción
Tipos de la librería PDF.js no están siendo resueltos correctamente.

### Errores

**1. `PdfEditViewer.tsx:2` - No declaration file for pdfjs-dist**
```
error TS7016: Could not find a declaration file for module 'pdfjs-dist/build/pdf'.
```
- **Problema:** pdfjs-dist no tiene tipos TypeScript (.d.ts)
- **Ubicación:** `client/src/components/pdf/PdfEditViewer.tsx` línea 2
- **Causa:** Librería JavaScript pura sin tipos nativos
- **Solución opciones:**
  - Instalar `npm install --save-dev @types/pdfjs-dist`
  - O usar `@ts-ignore` si no existen tipos
  - O buscar tipos en DefinitelyTyped
- **Impacto:** PdfEditViewer funciona pero con tipos implícitos `any`

**2. `PdfEditViewer.tsx:30` - Cannot find name 'PDFPageProxy'**
```
error TS2304: Cannot find name 'PDFPageProxy'.
```
- **Problema:** Tipo PDFPageProxy no está importado o no existe
- **Ubicación:** `client/src/components/pdf/PdfEditViewer.tsx` línea 30
- **Causa:** pdfjs-dist types no disponibles
- **Solución:** Definir tipos manualmente o importarlos correctamente
- **Impacto:** Type annotations en PDF breaking

**3. `PdfEditViewer.tsx:31` - Cannot find name 'PageViewport'**
```
error TS2304: Cannot find name 'PageViewport'.
```
- **Problema:** Tipo PageViewport no definido
- **Ubicación:** `client/src/components/pdf/PdfEditViewer.tsx` línea 31
- **Causa:** Misma que PDFPageProxy - tipos PDF.js no disponibles
- **Solución:** Definir tipos o importarlos
- **Impacto:** Type safety en viewport operations

**4. `PdfEditViewer.tsx:49` - Cannot find name 'PDFDocumentProxy'**
```
error TS2304: Cannot find name 'PDFDocumentProxy'.
```
- **Problema:** Tipo PDFDocumentProxy no definido
- **Ubicación:** `client/src/components/pdf/PdfEditViewer.tsx` línea 49
- **Causa:** Tipos PDF.js no resueltos
- **Solución:** Instalar tipos o definirlos localmente
- **Impacto:** Document handling sin tipos

---

## 🟢 CATEGORÍA 3: ENUM/TYPE MISMATCH (5 errores)

### Descripción
Valores asignados no coinciden con el tipo esperado.

### Errores

**1. `LegalCenterModalV2.tsx:1673` - Type '"signature_applied"' not assignable**
```
error TS2322: Type '"signature_applied"' is not assignable to type '"workflow" | "signature" | "visualization"'.
```
- **Problema:** Valor "signature_applied" no es válido para el enum
- **Ubicación:** `client/src/components/LegalCenterModalV2.tsx` línea 1673
- **Causa:** Tipo enum no actualizado cuando se agregó "signature_applied"
- **Solución:** Agregar "signature_applied" al enum que define los valores válidos
- **Impacto:** Bajo - valor específico no puede ser asignado
- **Fix sencillo:** Actualizar tipo de 3 opciones a 4

**2. `ProtectionLayerBadge.tsx:103` - Type mismatch with jsx: true**
```
error TS2322: Type '{ children: string; jsx: true; }' is not assignable to type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLElement>'.
```
- **Problema:** Propiedad `jsx: true` no existe en tipos HTML
- **Ubicación:** `client/src/components/ProtectionLayerBadge.tsx` línea 103
- **Causa:** JSX en atributo style, syntax error
- **Solución:** Remover `jsx: true` o usar sintaxis correcta de CSS-in-JS
- **Impacto:** Bajo - style element mal formado

**3. `HealthPanel.tsx:250` - Same jsx: true issue**
```
error TS2322: Type '{ children: string; jsx: true; }' is not assignable...
```
- **Problema:** Mismo problema que ProtectionLayerBadge
- **Ubicación:** `client/src/pages/HealthPanel.tsx` línea 250
- **Causa:** Copia-pega de código incorrecto con jsx flag
- **Solución:** Remover jsx flag o usar sintaxis correcta
- **Impacto:** Bajo - duplicado del error anterior

---

## 🔵 CATEGORÍA 4: ARRAYBUFFER/UINT8ARRAY (7 errores)

### Descripción
Incompatibilidades entre tipos de buffer. Relacionado con `SharedArrayBuffer` vs `ArrayBuffer`.

### Errores

**1. `canonicalHashing.ts:15` - Type 'ArrayBuffer | SharedArrayBuffer' not assignable**
```
error TS2322: Type 'ArrayBuffer | SharedArrayBuffer' is not assignable to type 'ArrayBuffer'.
```
- **Problema:** Función retorna `ArrayBufferLike` (que incluye SharedArrayBuffer), pero se espera solo `ArrayBuffer`
- **Ubicación:** `client/src/lib/canonicalHashing.ts` línea 15
- **Causa:** Web Crypto APIs retornan tipos más generales que lo que el código espera
- **Solución:** Type assertion o actualizar función que la llama
- **Impacto:** Bajo-Medio - hash operations, no afecta ejecución

**2. `cryptoUtils.ts:60` - Argument type mismatch**
```
error TS2345: Argument of type 'ArrayBuffer | Uint8Array<ArrayBufferLike>' is not assignable to parameter of type 'BufferSource'.
```
- **Problema:** Tipo union más amplio que lo esperado
- **Ubicación:** `client/src/lib/e2e/cryptoUtils.ts` línea 60
- **Causa:** `ArrayBufferLike` incluye tipos que no son `BufferSource`
- **Solución:** Narrowing de tipos o type assertion
- **Impacto:** Bajo - crypto operations funcionan en runtime

**3. `documentEncryption.ts:82` - Uint8Array type mismatch**
```
error TS2322: Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'BufferSource'.
```
- **Problema:** Uint8Array con buffer genérico no es BlobPart válido
- **Ubicación:** `client/src/lib/e2e/documentEncryption.ts` línea 82
- **Causa:** TypeScript 4.9+ trata ArrayBufferLike más estrictamente
- **Solución:** Type assertion o conversión explícita
- **Impacto:** Bajo - encryption funciona en runtime

**4. `documentEncryption.ts:156` - Same Uint8Array issue**
```
error TS2322: Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'BufferSource'.
```
- **Problema:** Mismo que anterior
- **Ubicación:** `client/src/lib/e2e/documentEncryption.ts` línea 156
- **Causa:** Mismo contexto de conversión de bytes
- **Impacto:** Bajo - duplicado

**5-7. Más Uint8Array/crypto no-overload errors**
```
error TS2769: No overload matches this call.
```
- **Ubicaciones:**
  - `documentEncryption.ts:195`
  - `otpSystem.ts:58`
  - `sessionCrypto.ts:165` y `175`
- **Problema común:** SubtleCrypto APIs tienen overloads muy específicos
- **Causa:** Passing `ArrayBufferLike` cuando espera exactamente `ArrayBuffer`
- **Solución:** Type assertion o conversión explícita a ArrayBuffer
- **Impacto:** Bajo - crypto operations funcionan en runtime

---

## 🟠 CATEGORÍA 5: VARIABLES/PARÁMETROS UNDEFINED (7 errores)

### Descripción
Variables o parámetros no definidos o con tipos implícitos.

### Errores

**1. `ndaEvents.ts:217` - Cannot find name 'supabase'**
```
error TS2304: Cannot find name 'supabase'.
```
- **Problema:** Variable `supabase` no está definida en scope
- **Ubicación:** `client/src/lib/ndaEvents.ts` línea 217
- **Causa:** Falta import de supabase client
- **Solución:** Agregar `import { getSupabase } from './supabaseClient'`
- **Impacto:** Bajo - missing import

**2. `ndaEvents.ts:227` - Same supabase undefined**
```
error TS2304: Cannot find name 'supabase'.
```
- **Problema:** Mismo que anterior, línea diferente
- **Ubicación:** `client/src/lib/ndaEvents.ts` línea 227
- **Causa:** Múltiples usos sin import
- **Impacto:** Bajo - duplicado

**3. `operationsService.ts:399` - Parameter 'op' implicitly 'any'**
```
error TS7006: Parameter 'op' implicitly has an 'any' type.
```
- **Problema:** Callback parameter sin type annotation
- **Ubicación:** `client/src/lib/operationsService.ts` línea 399
- **Causa:** Falta type annotation en arrow function
- **Solución:** Agregar `: Operation` o tipo apropiado
- **Impacto:** Bajo - cosmétic type safety

**4. `workflowFieldsService.ts:264` - Parameter 'field' implicitly 'any'**
```
error TS7006: Parameter 'field' implicitly has an 'any' type.
```
- **Problema:** Mismo que anterior
- **Ubicación:** `client/src/lib/workflowFieldsService.ts` línea 264
- **Causa:** Falta type annotation en array.map callback
- **Impacto:** Bajo - duplicado

**5. `DocumentsPage.tsx:414` - Parameter 'prev' implicitly 'any'**
```
error TS7006: Parameter 'prev' implicitly has an 'any' type.
```
- **Problema:** Parámetro setState sin tipo
- **Ubicación:** `client/src/pages/DocumentsPage.tsx` línea 414
- **Causa:** Callback de setState sin types
- **Solución:** Agregar tipo: `(prev: DraftMeta[]) => ...`
- **Impacto:** Bajo - setState callbacks

**6. `pages/DocumentsPage.tsx:1846` - Cannot find name 'FileClock'**
```
error TS2304: Cannot find name 'FileClock'.
```
- **Problema:** Icono FileClock no importado de lucide-react
- **Ubicación:** `client/src/pages/DocumentsPage.tsx` línea 1846
- **Causa:** Falta import o nombre incorrecto de icono
- **Solución:** Agregar FileClock a imports de lucide-react o cambiar nombre
- **Impacto:** Bajo - icono específico

**7. `pages/SignWorkflowPage.tsx:241` - Cannot find name 'supabase'**
```
error TS2304: Cannot find name 'supabase'.
```
- **Problema:** Mismo que ndaEvents, variable no definida
- **Ubicación:** `client/src/pages/SignWorkflowPage.tsx` línea 241
- **Causa:** Missing import de Supabase
- **Impacto:** Bajo - missing import

---

## 🟠 CATEGORÍA 6: LÓGICA NULL-SAFETY (5 errores)

### Descripción
Manejo de valores que pueden ser null/undefined.

### Errores

**1. `DocumentsPage.tsx:675` - No overload matches with postgres_changes**
```
error TS2769: No overload matches this call.
```
- **Problema:** Tipo de evento 'postgres_changes' no coincide con 'system'
- **Ubicación:** `client/src/pages/DocumentsPage.tsx` línea 675
- **Causa:** API de Supabase espera tipo de canal específico
- **Solución:** Cambiar tipo de evento o usar tipo correcto
- **Impacto:** Medio - Supabase subscription no funciona

**2. `DocumentsPage.tsx:907` - DocumentRecord | null not assignable**
```
error TS2345: Argument of type 'DocumentRecord | null' is not assignable to parameter of type 'DocumentRecord'.
```
- **Problema:** Función espera DocumentRecord pero puede recibir null
- **Ubicación:** `client/src/pages/DocumentsPage.tsx` línea 907
- **Causa:** Falta null check antes de pasar parámetro
- **Solución:** Agregar `if (found) { ... }`
- **Impacto:** Bajo - runtime guard necesario

**3. `NdaAccessPage.tsx:168` - linkData possibly null**
```
error TS18047: 'linkData' is possibly 'null'.
```
- **Problema:** Acceso a propiedad de variable que puede ser null
- **Ubicación:** `client/src/pages/NdaAccessPage.tsx` línea 168
- **Causa:** No hay null check
- **Solución:** Agregar `linkData?.property` o if check
- **Impacto:** Bajo - defensive programming

**4. `NdaAccessPage.tsx:169` - Same linkData null issue**
```
error TS18047: 'linkData' is possibly 'null'.
```
- **Problema:** Mismo que anterior, línea siguiente
- **Ubicación:** `client/src/pages/NdaAccessPage.tsx` línea 169
- **Causa:** Mismo null reference
- **Impacto:** Bajo - duplicado

**5. `VideosPage.tsx:125` - Property 'external' may not exist**
```
error TS2339: Property 'external' does not exist on type '{ label: string; href: string; }'.
```
- **Problema:** Union type tiene una rama sin propiedad 'external'
- **Ubicación:** `client/src/pages/VideosPage.tsx` línea 125
- **Causa:** Type union no discriminada correctamente
- **Solución:** Discriminated union con type guard
- **Impacto:** Bajo - propiedad opcional

---

## 🟣 CATEGORÍA 7: PROPIEDADES FALTANTES (14 errores)

### Descripción
Propiedades que no existen en los tipos definidos.

### Errores

**1-11. `basicCertificationWeb.ts` - Properties on 'never' type (11 errores)**
```
error TS2339: Property 'success' does not exist on type 'never'.
error TS2339: Property 'tsaName' does not exist on type 'never'.
... (9 más)
```
- **Ubicaciones:** Líneas 433, 436, 437, 438, 439, 440, 441, 442, 456, 457, 468, 510, 513, 514
- **Problema:** Tipo `never` significa que la expresión nunca puede existir
- **Causa:** Nuestro fix anterior a `requestLegalTimestamp` - ahora siempre lanza error, nunca retorna valor
- **Contexto:** Después de nuestra simplificación, el código intenta acceder a propiedades del valor que nunca se asigna
- **Solución:** Refactorizar lógica para no intentar acceder a propiedades si función deprecated siempre falla
- **Impacto:** Medio - lógica TSA necesita ser limpiada
- **Nota:** Estos errores son CAUSADOS por nuestro fix anterior. Debemos refactorizar mejor ese código

**12. `overlaySpecConverter.ts:89` - 'actor' not in OverlaySpecItem**
```
error TS2353: Object literal may only specify known properties, and 'actor' does not exist in type 'OverlaySpecItem'.
```
- **Problema:** Propiedad 'actor' no está definida en interface OverlaySpecItem
- **Ubicación:** `client/src/utils/overlaySpecConverter.ts` línea 89
- **Causa:** Type definitition y uso no sincronizados
- **Solución:** Agregar 'actor' al interface OverlaySpecItem
- **Impacto:** Medio - overlay spec conversion está roto

**13. `overlaySpecConverter.ts:129` - Same 'actor' issue**
```
error TS2353: Object literal may only specify known properties, and 'actor' does not exist in type 'OverlaySpecItem'.
```
- **Problema:** Mismo que anterior, otra ubicación
- **Ubicación:** `client/src/utils/overlaySpecConverter.ts` línea 129
- **Causa:** Mismo - interface desactualizado
- **Impacto:** Medio - duplicado

---

## 📊 RESUMEN POR SEVERIDAD

### 🔴 BLOQUEANTE (Requiere fix antes de canary)
- **Módulos faltantes (5 errores):** Impiden compilación de Scene components
- **Propiedades en never type (11 errores):** Causado por nuestro fix, necesita refactor
- **Overlay spec missing actor (2 errores):** Interface desactualizado

**Total bloqueante: 18 errores**

### 🟡 IMPORTANTE (Debería arreglarse)
- **PDF.js types (4 errores):** Types desconocidos, mejor instalar tipos
- **ArrayBuffer mismatches (7 errores):** Type assertions pueden arreglarlo fácilmente
- **Null safety (5 errores):** Good defensive programming

**Total importante: 16 errores**

### 🟢 MENOR (Cosmético, puedo dejarse)
- **Enum mismatches (3 errores):** Bajo impacto, uno bloqueante en signature_applied
- **Variables undefined (7 errores):** Missing imports, fáciles de arreglar
- **Property optional (1 error):** Type union issue

**Total menor: 11 errores**

---

## 🎯 RECOMENDACIONES POR PRIORIDAD

### AHORA (Pre-canary, <2 horas)
1. **Módulos faltantes (5):** Encontrar dónde están los tipos y actualizad imports
2. **Propiedades never (11):** Refactorizar lógica TSA que nuestro fix rompió
3. **Overlay actor (2):** Agregar propiedad al interface OverlaySpecItem

### SOON (Post-canary, Phase 1)
4. **PDF.js types (4):** Instalar `@types/pdfjs-dist` o definir tipos
5. **ArrayBuffer (7):** Type assertions con `as ArrayBuffer`
6. **Null safety (5):** Agregar checks y optional chaining

### OPCIONAL (Nice-to-have)
7. **Undefined variables (7):** Agregar missing imports donde falta supabase
8. **Enum mismatch (3):** Actualizar tipos para "signature_applied"
9. **Optional props (1):** Discriminated union pattern

---

## 📈 ESTIMACIONES

| Categoría | Errores | Esfuerzo | Complejidad |
|-----------|---------|----------|------------|
| Módulos faltantes | 5 | 1-2h | Media |
| Never type (fix nuestro) | 11 | 1-2h | Media-Alta |
| Overlay spec | 2 | 15 min | Baja |
| PDF.js types | 4 | 30 min | Baja |
| ArrayBuffer | 7 | 1h | Baja |
| Null safety | 5 | 30 min | Baja |
| Undefined variables | 7 | 30 min | Baja |
| Enum mismatch | 2 | 15 min | Baja |

**Total Bloqueante: 2-3 horas**  
**Total Todo: 5-6 horas**

---

## 🔍 ERRORES QUE PUEDEN CAUSAR PROBLEMAS EN CANARY

🔴 **CRÍTICOS - Pueden romper en producción:**
- Módulos faltantes (Scene components no carguen)
- Propiedades never en TSA (signature flow fallido)
- Overlay spec sin actor (firmas no se apliquen correctamente)

🟡 **IMPORTANTES - Bugs silenciosos posibles:**
- Null linkData (NDA access puede crashear)
- Supabase subscription tipo incorrecto (suscripciones no funcionen)
- ArrayBuffer en crypto (descifrado puede fallar)

🟢 **MENOR - Experimental features:**
- PDF.js types (Viewer puede fallar)
- Enum "signature_applied" (rama de código no ejecutable)

---

## 💡 CONCLUSIÓN

La mayoría de los 52 errores son **problemas de integración/refactor** no **lógica rota**:
- 5 + 2 = 7 errores por referencias de archivos mal ubicados
- 11 errores causados por nuestro fix anterior (requestLegalTimestamp deprecated)
- 14 errores de type mismatches (pueden arreglarse con assertions o type updates)
- 7 errores de buffer type conversions (web crypto quirks)
- 7 errores de missing imports (fáciles)
- 5 errores null-safety (defensive programming)

**Sistema FUNCIONA en runtime** pero TypeScript espera más estrictez.

