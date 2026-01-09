# PASO 3 - Baseline de Comportamiento

**Fecha**: 2026-01-06
**Objetivo**: Congelar comportamiento actual antes de integrar módulos en LegalCenterModalV2

---

## Estado Actual de Integración

| Módulo | Extraído | Integrado | Líneas en Modal | Notas |
|--------|----------|-----------|-----------------|-------|
| protection | ✅ | ✅ | 2112-2116 | Ya usa `<ProtectionToggle />` |
| signature | ✅ | ❌ | 2117-2140 | Toggle inline + modal flotante (1916-2090) |
| flow | ✅ | ❌ | 2141+ | Toggle inline + acordeón (2196-2281) |
| nda | ✅ | ❌ | 2100-2110 | Toggle simple inline (sin panel) |

---

## 1. Protección (YA INTEGRADO ✅)

### Toggle
**Ubicación**: LegalCenterModalV2.tsx:2112-2116
**Implementación**: `<ProtectionToggle />`

```tsx
<ProtectionToggle
  enabled={forensicEnabled}
  onToggle={setForensicEnabled}
  disabled={!file}
/>
```

### Estados relacionados
- `forensicEnabled` (boolean)
- `forensicConfig` (ForensicConfig)
  - `useLegalTimestamp: true`
  - `usePolygonAnchor: true`
  - `useBitcoinAnchor: true`

### Comportamiento
- **ON**: Toast "🛡️ Protección activada..."
- **OFF**: Sin toast
- **Modales**: ProtectionInfoModal, ProtectionWarningModal (ya integrados)

---

## 2. Mi Firma (PENDIENTE ❌)

### Toggle Actual
**Ubicación**: LegalCenterModalV2.tsx:2117-2140
**Tipo**: `<button>` inline

```tsx
<button
  onClick={() => {
    const newState = !mySignature;
    setMySignature(newState);
    if (newState && file) {
      setShowSignatureOnPreview(true);
      toast('Vas a poder firmar directamente sobre el documento.', {...});
    }
  }}
  className={mySignature ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}
>
  Mi Firma
</button>
```

### Estados relacionados
- `mySignature` (boolean)
- `userHasSignature` (boolean)
- `showSignatureOnPreview` (boolean)
- `signatureMode`: 'none' | 'canvas' | 'signnow'
- `signatureTab`: 'draw' | 'type' | 'upload'
- `hasSignature` (from useSignatureCanvas)
- `typedSignature` (string)
- `uploadedSignature` (string | null)

### Modal Flotante
**Ubicación**: LegalCenterModalV2.tsx:1916-2090
**Trigger**: `showSignatureOnPreview === true`

**Estructura**:
- Header: "Firmá tu documento" + botón volver
- Tabs: Dibujar | Escribir | Subir
- Canvas: useSignatureCanvas hook
- Botones: Limpiar | Aplicar firma

**Comportamiento al aplicar firma**:
1. Valida que sea PDF
2. `setUserHasSignature(true)`
3. `setSignatureMode('canvas')`
4. `setShowSignatureOnPreview(false)`
5. Toast: "Firma aplicada correctamente."

### Comportamiento Toggle
- **Click ON**:
  - `setMySignature(true)`
  - `setShowSignatureOnPreview(true)` (abre modal)
  - Toast: "Vas a poder firmar directamente sobre el documento."
- **Click OFF**:
  - `setMySignature(false)`
  - No toast
  - Modal NO se cierra automáticamente

---

## 3. Flujo de Firmas (PENDIENTE ❌)

### Toggle Actual
**Ubicación**: LegalCenterModalV2.tsx:2141+
**Tipo**: `<button>` inline

```tsx
<button
  onClick={() => {
    const newState = !workflowEnabled;
    setWorkflowEnabled(newState);
    if (newState) {
      toast('Agregá los correos de las personas que deben firmar...', {...});
    }
  }}
  className={workflowEnabled ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}
>
  Flujo
</button>
```

### Estados relacionados
- `workflowEnabled` (boolean)
- `workflowAccordionOpen` (boolean)
- `emailInputs` (EmailInput[])
- `signerCount` (number) - calculado

### Acordeón
**Ubicación**: LegalCenterModalV2.tsx:2196-2281
**Trigger**: `workflowEnabled === true`

**Estructura**:
- Header: "Flujo de Firmas" + contador firmantes + chevron
- Body (si `workflowAccordionOpen`):
  - Descripción
  - Lista inputs (email + nombre + eliminar)
  - Botón "Agregar otro firmante"
  - Box "Seguridad obligatoria" (Shield icon)

### Comportamiento Toggle
- **Click ON**:
  - `setWorkflowEnabled(true)`
  - Toast: "Agregá los correos de las personas que deben firmar o recibir el documento."
- **Click OFF**:
  - `setWorkflowEnabled(false)`
  - No toast
  - Acordeón se oculta

---

## 4. NDA (PENDIENTE ❌)

### Toggle Actual
**Ubicación**: LegalCenterModalV2.tsx:2100-2110
**Tipo**: `<button>` inline (placeholder)

```tsx
<button
  onClick={() => setNdaEnabled(!ndaEnabled)}
  className={ndaEnabled ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}
>
  NDA
</button>
```

### Estados relacionados
- `ndaEnabled` (boolean)
- `ndaText` (string) - texto completo del NDA

### Panel NDA
**Ubicación**: TODO - No existe todavía
**Status**: Feature no implementada

### Comportamiento Toggle
- **Click ON**: `setNdaEnabled(true)` - sin toast, sin panel
- **Click OFF**: `setNdaEnabled(false)` - sin toast

**NOTA**: Este toggle es solo un placeholder. El panel izquierdo con editor NO está implementado.

---

## Validación Manual Checklist

Antes de empezar PASO 3.2, abrir Centro Legal y confirmar:

- [ ] Toggle Protección funciona (ON/OFF)
- [ ] Modal "Qué incluye la protección?" abre correctamente
- [ ] Modal "¿Estás seguro?" aparece al desactivar
- [ ] Toggle Mi Firma abre modal flotante al activar
- [ ] Canvas de firma funciona (dibujar, escribir, subir)
- [ ] "Aplicar firma" cierra modal y marca como firmado
- [ ] Toggle Flujo abre acordeón con inputs
- [ ] "Agregar firmante" funciona
- [ ] Eliminar firmante funciona
- [ ] Toggle NDA solo cambia estado (sin UI visible)

---

## Orden de Integración (PASO 3.2)

```
1. Mi Firma    → Reemplazar toggle + modal flotante
2. Flujo       → Reemplazar toggle + acordeón
3. NDA         → Reemplazar solo toggle (sin feature)
```

**Protección ya está hecho** ✅ (no tocar)

---

## Señal de DONE

Al finalizar PASO 3:

- [ ] 4 toggles vienen de `/modules/*`
- [ ] Modal de firma viene de `/modules/signature`
- [ ] Acordeón flujo viene de `/modules/flow`
- [ ] LegalCenterModalV2.tsx < 1500 líneas
- [ ] Comportamiento idéntico al baseline
- [ ] Tests manuales pasan

---

**Última actualización**: 2026-01-06
**Siguiente paso**: PASO 3.2 - Integrar módulo "Mi Firma"
