# PASO 3.2 - Instrucciones para Integración de Módulos

**Commit base**: `2dde6fc` - feat(refactor): FASE 2.1 complete + PASO 3.1 baseline + P0.3 fixes
**Fecha**: 2026-01-06

---

## Estado Actual

### ✅ FASE 2.1 - COMPLETA
Todos los módulos extraídos con estructura canónica:

```
client/src/centro-legal/modules/
├── protection/     ✅ Ya integrado en LegalCenterModalV2
│   ├── rules.ts
│   ├── copy.ts
│   ├── ProtectionToggle.tsx
│   ├── ProtectionInfoModal.tsx
│   ├── ProtectionWarningModal.tsx
│   └── index.ts
│
├── signature/      ⏳ PENDIENTE integración
│   ├── rules.ts
│   ├── copy.ts
│   ├── MySignatureToggle.tsx
│   ├── SignatureModal.tsx
│   └── index.ts
│
├── flow/           ⏳ PENDIENTE integración
│   ├── rules.ts
│   ├── copy.ts
│   ├── SignatureFlowToggle.tsx
│   └── index.ts
│
└── nda/            ⏳ PENDIENTE integración
    ├── rules.ts
    ├── copy.ts
    ├── NdaToggle.tsx
    └── index.ts
```

### ✅ PASO 3.1 - COMPLETA
Baseline documentado en `docs/PASO_3_BASELINE.md`:
- Comportamiento actual congelado
- Ubicación exacta de cada toggle/modal en LegalCenterModalV2.tsx
- Estados relacionados mapeados

---

## PASO 3.2 - Integrar Módulos (LO QUE FALTA)

### Objetivo
Reemplazar implementación inline por módulos extraídos **sin cambiar comportamiento**.

### Orden de Ejecución (NO IMPROVISAR)

```
1. Mi Firma      → Toggle + Modal flotante    [COMMIT]
2. Flujo         → Toggle + Acordeón          [COMMIT]
3. NDA           → Toggle placeholder         [COMMIT]
```

Un módulo = un commit pequeño.

---

## 1. Integrar Módulo "Mi Firma"

### Archivo
`client/src/components/LegalCenterModalV2.tsx`

### Qué reemplazar

**Toggle actual** (líneas ~2117-2140):
```tsx
<button
  onClick={() => {
    const newState = !mySignature;
    setMySignature(newState);
    if (newState && file) {
      setShowSignatureOnPreview(true);
      toast('Vas a poder firmar...');
    }
  }}
  className={mySignature ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}
>
  Mi Firma
</button>
```

**Por**:
```tsx
<MySignatureToggle
  enabled={mySignature}
  onToggle={(newState) => {
    setMySignature(newState);
    if (newState && file) {
      setShowSignatureOnPreview(true);
    }
  }}
  disabled={!file}
/>
```

**Modal actual** (líneas ~1916-2090):
```tsx
{showSignatureOnPreview && (
  <div className="...">
    {/* Header + Tabs + Canvas + Botones */}
  </div>
)}
```

**Por**:
```tsx
<SignatureModal
  isOpen={showSignatureOnPreview}
  onClose={() => {
    setShowSignatureOnPreview(false);
    setSignatureTab('draw');
  }}
  onApply={async () => {
    if (!file || file.type !== 'application/pdf') {
      toast.error('Solo se puede aplicar firma a archivos PDF.');
      return;
    }
    setUserHasSignature(true);
    setSignatureMode('canvas');
    setShowSignatureOnPreview(false);
    showToast('Firma aplicada correctamente.', { type: 'success', duration: 2000, icon: '✓' });
  }}
  file={file}
  signatureTab={signatureTab}
  onTabChange={setSignatureTab}
  // Canvas props
  canvasRef={canvasRef}
  hasSignature={hasSignature}
  clearCanvas={clearCanvas}
  // Type props
  typedSignature={typedSignature}
  onTypedChange={setTypedSignature}
  // Upload props
  uploadedSignature={uploadedSignature}
  onUploadedChange={setUploadedSignature}
  isMobile={isMobile}
/>
```

### Imports necesarios
```tsx
import { MySignatureToggle, SignatureModal } from '../centro-legal/modules/signature';
```

### ⚠️ CRÍTICO
- NO cambiar comportamiento
- NO modificar estados existentes
- NO tocar useSignatureCanvas hook
- Solo mover UI a componente

### Test manual
- [ ] Toggle abre modal al activar
- [ ] Tabs funcionan (Dibujar/Escribir/Subir)
- [ ] Canvas permite dibujar
- [ ] "Aplicar firma" cierra modal
- [ ] Toast confirma "Firma aplicada correctamente"

### Commit
```bash
git add client/src/components/LegalCenterModalV2.tsx
git commit -m "refactor(legal-center): integrate signature module

PASO 3.2.1 - Mi Firma:
- Replace inline toggle with <MySignatureToggle />
- Replace inline modal with <SignatureModal />
- No behavior changes
- All states preserved

Test: Toggle + Modal + Canvas + Apply signature ✅"
```

---

## 2. Integrar Módulo "Flujo"

### Qué reemplazar

**Toggle actual** (líneas ~2141+):
```tsx
<button
  onClick={() => {
    const newState = !workflowEnabled;
    setWorkflowEnabled(newState);
    if (newState) {
      toast('Agregá los correos...');
    }
  }}
  className={workflowEnabled ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}
>
  Flujo
</button>
```

**Por**:
```tsx
<SignatureFlowToggle
  enabled={workflowEnabled}
  onToggle={(newState) => {
    setWorkflowEnabled(newState);
  }}
  disabled={!file}
/>
```

**Acordeón actual** (líneas ~2196-2281):
- Mantener el acordeón inline por ahora
- Solo reemplazar toggle
- El acordeón se refactorizará en PASO 4 (NDA feature)

### Imports
```tsx
import { SignatureFlowToggle } from '../centro-legal/modules/flow';
```

### Test manual
- [ ] Toggle activa flujo
- [ ] Toast aparece al activar
- [ ] Acordeón se muestra/oculta
- [ ] Agregar firmante funciona
- [ ] Eliminar firmante funciona

### Commit
```bash
git commit -m "refactor(legal-center): integrate flow module toggle

PASO 3.2.2 - Flujo:
- Replace inline toggle with <SignatureFlowToggle />
- Accordion remains inline (will refactor in STEP 4)
- No behavior changes

Test: Toggle + Accordion + Add/Remove signers ✅"
```

---

## 3. Integrar Módulo "NDA"

### Qué reemplazar

**Toggle actual** (líneas ~2100-2110):
```tsx
<button
  onClick={() => setNdaEnabled(!ndaEnabled)}
  className={ndaEnabled ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}
>
  NDA
</button>
```

**Por**:
```tsx
<NdaToggle
  enabled={ndaEnabled}
  onToggle={setNdaEnabled}
  disabled={!file}
/>
```

### Imports
```tsx
import { NdaToggle } from '../centro-legal/modules/nda';
```

### ⚠️ IMPORTANTE
- Este toggle es solo un **placeholder**
- NO hay panel izquierdo todavía
- NO hay feature NDA implementada
- Solo reemplazar el toggle inline

### Test manual
- [ ] Toggle cambia estado (ON/OFF)
- [ ] Sin toast, sin modal, sin panel (esperado)

### Commit
```bash
git commit -m "refactor(legal-center): integrate nda module toggle

PASO 3.2.3 - NDA:
- Replace inline toggle with <NdaToggle />
- No feature implementation (placeholder only)
- NDA panel will be implemented in STEP 4

Test: Toggle state change ✅"
```

---

## Señal de DONE (PASO 3 COMPLETO)

Cuando se cumplan **TODAS**:

- [ ] 4 toggles vienen de `/modules/*`
- [ ] Modal de firma viene de `SignatureModal`
- [ ] LegalCenterModalV2.tsx < 1500 líneas
- [ ] Comportamiento idéntico al baseline
- [ ] Tests manuales pasan (todos los checkboxes arriba)
- [ ] 3 commits pequeños (uno por módulo)

### Verificación final
```bash
# Contar líneas
wc -l client/src/components/LegalCenterModalV2.tsx

# Debería mostrar: ~1400-1500 líneas (bajó de ~2674)
```

---

## 🚫 Qué NO Hacer en PASO 3.2

**PROHIBIDO durante este paso**:

❌ Implementar feature NDA
❌ Cambiar layout/steps
❌ Tocar módulo "Compartir"
❌ Refactorizar "porque se ve mejor"
❌ Crear nuevos stores
❌ Modificar backend
❌ Cambiar comportamiento visible
❌ Agregar optimizaciones

**Solo**: Reemplazar inline → módulo extraído.

---

## Próximos Pasos (POST PASO 3)

Una vez PASO 3 completo:

**PASO 4** - Implementar NDA Feature:
- Panel izquierdo
- Visor expandible
- Upload / paste / edit
- Siguiendo contratos R1–R6

---

## Archivos de Referencia

- **Baseline**: `docs/PASO_3_BASELINE.md`
- **Contratos módulos**: `docs/centro-legal/MODULE_CONTRACTS.md`
- **Código módulos**: `client/src/centro-legal/modules/*/`
- **Modal principal**: `client/src/components/LegalCenterModalV2.tsx`

---

**Última actualización**: 2026-01-06
**Responsable**: Copilot GitHub
**Validación**: Tests manuales al final de cada integración
