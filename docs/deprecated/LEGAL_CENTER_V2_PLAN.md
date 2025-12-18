# Plan de Implementación LegalCenterModalV2

## Estrategia

En lugar de reescribir TODO desde cero (1788 líneas), voy a:

1. Copiar LegalCenterModal.jsx → LegalCenterModalV2.jsx
2. Aplicar SOLO cambios de lógica según LEGAL_CENTER_CONSTITUTION.md
3. Mantener 100% del diseño visual intacto

## Cambios específicos a aplicar

### 1. Estados (líneas ~42-100)
- ✅ Añadir: `documentLoaded` (control de visibilidad de acciones)
- ✅ Mantener todos los demás estados (no eliminar nada)

### 2. Funciones helper (nuevas, añadir después de línea 700)
```javascript
const getCTAText = () => {
  const actions = ['Proteger'];
  if (mySignature && userHasSignature && signatureType) actions.push('firmar');
  if (workflowEnabled && emailInputs.some(e => e.email.trim())) actions.push('enviar mails');
  return actions.join(' y ');
};

const isCTAEnabled = () => {
  if (!mySignature && !workflowEnabled && !ndaEnabled) return true;
  if (mySignature && (!userHasSignature || !signatureType)) return false;
  if (workflowEnabled && !emailInputs.some(e => e.email.trim())) return false;
  return true;
};
```

### 3. handleFileSelect (línea ~201)
- Añadir: `setDocumentLoaded(true)`
- Cambiar toast a: "Documento listo.\nEcoSign no ve tu documento.\nLa certificación está activada por defecto."
- Si `initialAction === 'sign' || mySignature`: abrir modal firma + toast

### 4. Visibilidad de acciones (línea ~1280)
- Envolver botones NDA/Mi Firma/Flujo en: `{(documentLoaded || initialAction) && (...)}`

### 5. CTA (línea ~1430)
- Reemplazar texto hardcodeado con: `{getCTAText()}`
- Añadir `disabled={!file || !isCTAEnabled()}`
- Handler: validar con `isCTAEnabled()` y mostrar toasts según Constitución

### 6. handleApplySignature (donde se aplica firma)
- Toast: "Firma aplicada correctamente."
- Toast interactivo (Constitución 7.3): elegir tipo legal/certificada
- Actualizar: `setUserHasSignature(true)`

### 7. Tooltip del escudo (línea ~960)
- Copy: "Certificación activa. La certificación protege tu documento con trazabilidad verificable. Si querés, podés desactivarla desde acá (no recomendado)."

### 8. Toast al desactivar certificación
- "La certificación fue desactivada.\nEl documento tendrá menor protección."

## Lo que NO se toca (mantener intacto)

- ❌ Grid layout (3 columnas con colapso)
- ❌ Estilos, colores, spacing
- ❌ Preview de documento
- ❌ Animaciones y transiciones
- ❌ Modal de firma dentro del preview
- ❌ Panels NDA y Flujo
- ❌ Header, iconos, tooltip positions
- ❌ handleFinalize completo (lógica de certificación)
- ❌ Funciones de anotación (aunque no se usen)
- ❌ Sistema de pasos (step 1, 2, 3)
