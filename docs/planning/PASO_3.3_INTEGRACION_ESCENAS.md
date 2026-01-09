# 🎯 PASO 3.3 — INTEGRACIÓN DE ESCENAS

**Estado:** READY TO IMPLEMENT  
**Archivos creados:** ✅  
**Duración estimada:** 2-4 horas

---

## 📦 ESCENAS CREADAS

```
/centro-legal/scenes/
  ✅ DocumentScene.tsx      - Upload + Preview
  ✅ NdaScene.tsx           - NDA Configuration
  ✅ SignatureScene.tsx     - Visual Signature Editor
  ✅ FlowScene.tsx          - Signer Management
  ✅ ReviewScene.tsx        - Final Review
  ✅ index.ts               - Barrel export
```

```
/centro-legal/orchestration/
  ✅ resolveActiveScene.ts  - Scene routing logic
  ✅ resolveGridLayout.ts   - Grid layout resolver (ya existía)
```

---

## 🎯 OBJETIVO DE LA INTEGRACIÓN

Reemplazar el renderizado inline del `LegalCenterModalV2` por:

```tsx
// ❌ ANTES (monolito)
return (
  <div>
    {!file && <div>/* 100 líneas de dropzone */</div>}
    {file && ndaEnabled && <div>/* 200 líneas de NDA */</div>}
    {file && signatureEnabled && <div>/* 300 líneas de firma */</div>}
    // ... etc
  </div>
);

// ✅ DESPUÉS (escenas)
const activeScene = resolveActiveScene({
  hasFile: !!file,
  ndaEnabled,
  mySignatureEnabled,
  workflowEnabled,
  isReviewStep
});

return (
  <SceneRenderer scene={activeScene} {...props} />
);
```

---

## 📋 CHECKLIST DE INTEGRACIÓN

### 1️⃣ Crear SceneRenderer

Archivo: `client/src/components/centro-legal/layout/SceneRenderer.tsx`

```tsx
import React from 'react';
import {
  DocumentScene,
  NdaScene,
  SignatureScene,
  FlowScene,
  ReviewScene
} from '../scenes';
import type { SceneType } from '../orchestration/resolveActiveScene';

interface SceneRendererProps {
  scene: SceneType;
  // ... props específicos de cada escena
}

export function SceneRenderer({ scene, ...props }: SceneRendererProps) {
  switch (scene) {
    case 'document':
      return <DocumentScene {...props} />;
    case 'nda':
      return <NdaScene {...props} />;
    case 'signature':
      return <SignatureScene {...props} />;
    case 'flow':
      return <FlowScene {...props} />;
    case 'review':
      return <ReviewScene {...props} />;
    default:
      return <DocumentScene {...props} />;
  }
}
```

### 2️⃣ Actualizar LegalCenterModalV2

**Cambios mínimos:**

```tsx
// 1. Import scenes y orchestration
import { SceneRenderer } from './centro-legal/layout/SceneRenderer';
import { resolveActiveScene, getSceneTitle } from './centro-legal/orchestration/resolveActiveScene';

// 2. Resolver escena activa (dentro del render)
const activeScene = resolveActiveScene({
  hasFile: !!file,
  ndaEnabled,
  mySignatureEnabled,
  workflowEnabled,
  isReviewStep: currentStep === 4
});

const sceneTitle = getSceneTitle(activeScene);

// 3. Reemplazar todo el bloque de renderizado condicional por:
<SceneRenderer
  scene={activeScene}
  file={file}
  filePreviewUrl={filePreviewUrl}
  ndaEnabled={ndaEnabled}
  ndaContent={ndaContent}
  onNdaContentChange={setNdaContent}
  signatureFields={signatureFields}
  onFieldsChange={setSignatureFields}
  signerEmails={signerInputs.map(s => s.email)}
  onSignerEmailsChange={(emails) => {
    // mapear a signerInputs
  }}
  forensicEnabled={forensicEnabled}
  mySignatureEnabled={mySignature}
  workflowEnabled={workflowEnabled}
  signerCount={signerInputs.length}
  isMobile={isMobile}
  // ... resto de props necesarios
/>
```

### 3️⃣ Eliminar código inline

**Buscar y eliminar:**

- ❌ Dropzone inline (líneas ~1800-1900)
- ❌ Preview inline (líneas ~1900-2000)
- ❌ Configuración de firmantes inline (líneas ~2100-2300)

**Mantener:**

- ✅ Toda la lógica de handlers (handleFileChange, handleCertify, etc)
- ✅ Todos los estados
- ✅ Toggles en bottom actions
- ✅ Header y footer
- ✅ Modales de confirmación

### 4️⃣ Validar comportamiento

```bash
# 1. Subir documento → DocumentScene
# 2. Activar NDA → NdaScene
# 3. Activar Mi Firma → SignatureScene (si existe)
# 4. Activar Flujo → FlowScene
# 5. Click en "Certificar" → ReviewScene
```

---

## 🚫 QUÉ NO TOCAR

- ❌ No cambiar lógica de certificación (handleCertify)
- ❌ No cambiar estados existentes
- ❌ No cambiar comportamiento de toggles
- ❌ No cambiar modales (ProtectionWarning, etc)
- ❌ No optimizar código "porque ahora se ve mejor"

---

## ✅ DEFINICIÓN DE DONE

- [ ] SceneRenderer creado y funcional
- [ ] LegalCenterModalV2 usa SceneRenderer
- [ ] Código inline eliminado (~500+ líneas menos)
- [ ] Comportamiento idéntico al baseline
- [ ] Tests manuales pasan (upload, NDA, flujo, certificar)
- [ ] Sin regresiones visuales
- [ ] Git commit limpio

---

## 📊 IMPACTO ESPERADO

```
Líneas antes: 2616
Líneas después: ~1000-1200

Reducción: ~1400-1600 líneas
Método: Extracción a escenas, no eliminación de funcionalidad
```

---

## 🧭 DESPUÉS DE ESTO

✅ **PASO 3.3 COMPLETADO**  
✅ **Refactorización estructural TERMINADA**  
🚀 **BLOQUE 4 — PDF Witness HABILITADO**

El Centro Legal quedará completamente modular y listo para escalar.
