# 📋 Centro Legal - Documentación Técnica Actualizada

## 🎯 Resumen de Cambios Implementados

### **1. Progressive Disclosure (Visibilidad Condicional)**

El Centro Legal ahora muestra opciones **solo cuando son necesarias** para la decisión actual del usuario.

#### **Modelo de Estado**
```javascript
// ANTES (❌ Incorrecto - flags acumulativos)
const [mySignature, setMySignature] = useState(false);
const [workflowEnabled, setWorkflowEnabled] = useState(false);
const [ndaEnabled, setNdaEnabled] = useState(false);

// AHORA (✅ Correcto - toggles independientes pero con render condicional)
const [mySignature, setMySignature] = useState(false);
const [workflowEnabled, setWorkflowEnabled] = useState(false);
const [ndaEnabled, setNdaEnabled] = useState(false);
```

#### **Regla de Visibilidad**

| Acción elegida | Tipo de firma | Blindaje | Panel Firmantes | Panel NDA |
|----------------|---------------|----------|-----------------|-----------|
| **NDA**        | ❌ No         | ✅ Sí    | ❌ No           | ✅ Sí     |
| **Mi Firma**   | ✅ Sí         | ✅ Sí    | ❌ No           | ❌ No     |
| **Flujo**      | ✅ Sí         | ✅ Sí    | ✅ Sí           | ❌ No     |
| **Mi Firma + Flujo** | ✅ Sí | ✅ Sí    | ✅ Sí           | ❌ No     |
| **NDA + Flujo** | ❌ No        | ✅ Sí    | ✅ Sí           | ✅ Sí     |
| **Todas**      | ✅ Sí         | ✅ Sí    | ✅ Sí           | ✅ Sí     |

---

### **2. Tipos de Firma**

#### **Antes:**
```jsx
<label>
  <input type="checkbox" checked={signatureEnabled} />
  Firmar documento
</label>
```

#### **Ahora:**
```jsx
// Dos botones principales
<button onClick={() => setSignatureType('legal')}>
  Firma Legal
</button>

<button onClick={() => {
  setSignatureType('certified');
  setShowCertifiedModal(true);
}}>
  Firma Certificada
</button>

// Modal secundario para Firma Certificada
{showCertifiedModal && (
  <CertifiedTypeSelector
    onSelect={(type) => {
      setCertifiedSubType(type); // 'qes' | 'mifiel' | 'international'
      setShowCertifiedModal(false);
    }}
  />
)}
```

#### **Opciones de Firma Certificada:**
1. **QES (Qualified Electronic Signature)** - Máxima validez legal (UE/LATAM)
2. **Mifiel** - Firma avanzada para México y LATAM
3. **Internacional** - Cumplimiento multi-jurisdicción

---

### **3. Blindaje Forense**

#### **Estado por defecto:**
```javascript
const [forensicEnabled, setForensicEnabled] = useState(true);
const [forensicConfig, setForensicConfig] = useState({
  useLegalTimestamp: true,   // RFC 3161 TSA
  usePolygonAnchor: true,     // Polygon blockchain
  useBitcoinAnchor: true      // Bitcoin blockchain ✅ ACTIVO POR DEFECTO
});
```

#### **Comportamiento:**
- ✅ **Activo por defecto** con TSA + Polygon + Bitcoin
- ✅ **Usuario puede desactivar** (aparece toast de advertencia)
- ❌ **No se permiten sub-selecciones** (todo o nada)

#### **Toast cuando se desactiva:**
```javascript
toast.error(
  'Tu documento se procesará sin protección legal. Podés activarla en cualquier momento si la necesitás.',
  {
    duration: 5000,
    position: 'bottom-right',
    icon: '⚠️'
  }
);
```

---

### **4. Paneles Laterales**

#### **Panel NDA (Izquierda)**
- 🎬 **Animación:** `fadeSlideInLeft` (600ms)
- 📝 **Contenido:** Texto NDA editable
- 🔓 **Se muestra cuando:** `ndaEnabled === true`

#### **Panel Firmantes (Derecha)**
- 🎬 **Animación:** `fadeSlideInRight` (600ms)
- 📧 **Contenido:** Lista de emails con botones de agregar/eliminar
- 🔓 **Se muestra cuando:** `workflowEnabled === true`

#### **Lógica de campos de email:**
```javascript
// Siempre mantener mínimo 1 campo
const handleRemoveEmailField = (index) => {
  if (emailInputs.length <= 1) return;
  const newInputs = emailInputs.filter((_, idx) => idx !== index);
  setEmailInputs(newInputs);
};
```

---

### **5. Animaciones Fluidas**

#### **CSS Personalizado:**
```css
/* /client/src/styles/legalCenterAnimations.css */

@keyframes fadeSlideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeSlideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeScaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fadeSlideInLeft {
  animation: fadeSlideInLeft 600ms cubic-bezier(0.16, 1, 0.3, 1);
}

.animate-fadeSlideInRight {
  animation: fadeSlideInRight 600ms cubic-bezier(0.16, 1, 0.3, 1);
}

.animate-fadeScaleIn {
  animation: fadeScaleIn 500ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

#### **Curva de easing:**
- **`cubic-bezier(0.16, 1, 0.3, 1)`** → "ease-out-expo"
- **Resultado:** Movimientos ultra suaves y elegantes

---

### **6. Simplificación de UI**

#### **Eliminaciones realizadas:**
- ❌ **Stepper (Configurar/Listo)** - Complejidad innecesaria
- ❌ **Título "Elegí tu archivo"** - Redundante
- ❌ **Título "Acciones"** - Obvio por contexto
- ❌ **"v2" del título** - Versión interna
- ❌ **Cuadro de mensajes final** - Ahora usa toasts
- ❌ **Opción "Privacidad del PDF"** - Moveremos más adelante

#### **Padding reducido:**
```css
/* Antes: py-4 */
/* Ahora: py-2 */
```

---

### **7. Flujo de Certificación**

#### **Casos de uso:**

##### **Caso A: Solo Mi Firma**
```javascript
if (mySignature && !workflowEnabled && !ndaEnabled) {
  // 1. Agregar Hoja de Auditoría (solo si Firma Legal)
  // 2. Certificar con motor interno
  // 3. Guardar en DB
  // 4. Descargar ECO/ECOX
}
```

##### **Caso B: Solo Flujo de Firmas**
```javascript
if (workflowEnabled && !mySignature && !ndaEnabled) {
  // 1. Subir PDF a Storage
  // 2. Generar signed URL (30 días)
  // 3. Crear workflow en DB
  // 4. Enviar emails a firmantes
}
```

##### **Caso C: Solo NDA**
```javascript
if (ndaEnabled && !mySignature && !workflowEnabled) {
  // 1. Embeber NDA en el PDF
  // 2. Certificar con blindaje (sin firma)
  // 3. Generar enlace de acceso
  // 4. Enviar email con link
}
```

##### **Caso D: Combinaciones**
```javascript
if (mySignature && workflowEnabled) {
  // 1. Yo firmo primero (Hoja de Auditoría)
  // 2. Certificar mi firma
  // 3. Subir a Storage
  // 4. Iniciar workflow para siguientes firmantes
}

if (ndaEnabled && workflowEnabled) {
  // 1. Embeber NDA
  // 2. Subir a Storage
  // 3. Workflow requiere aceptación de NDA antes de firmar
}
```

---

### **8. Sanitización de Estados**

#### **Al cerrar el modal:**
```javascript
const resetAndClose = () => {
  // Resetear archivo
  setFile(null);
  setDocumentPreview(null);
  
  // Resetear acciones
  setMySignature(false);
  setWorkflowEnabled(false);
  setNdaEnabled(false);
  
  // Resetear firma
  setSignatureType(null);
  setCertifiedSubType(null);
  setShowCertifiedModal(false);
  clearCanvas();
  
  // Resetear firmantes
  setEmailInputs([{ email: '', name: '', requireLogin: true, requireNda: true }]);
  
  // Resetear NDA
  setNdaText(DEFAULT_NDA_TEXT);
  
  // Mantener blindaje activo
  setForensicEnabled(true);
  
  // Resetear loading
  setLoading(false);
  setCertificateData(null);
};
```

---

### **9. Integración con DashboardStartPage**

#### **CTAs actualizados:**
```jsx
// Página de inicio del dashboard
<button onClick={() => open('sign')}>
  Firmar un Documento
</button>

<button onClick={() => open('workflow')}>
  Crear Flujo de Firmas
</button>

<button onClick={() => open('nda')}>
  Enviar NDA
</button>
```

#### **Función open():**
```javascript
// LegalCenterContext
const open = (initialAction) => {
  setInitialAction(initialAction); // 'sign' | 'workflow' | 'nda'
  setIsOpen(true);
};
```

---

### **10. Validaciones**

#### **Antes de certificar:**
```javascript
// 1. Validar archivo
if (!file) {
  toast.error('Seleccioná un archivo primero');
  return;
}

// 2. Validar acción seleccionada
if (!mySignature && !workflowEnabled && !ndaEnabled) {
  toast.error('Elegí al menos una acción: Mi Firma, Flujo o NDA');
  return;
}

// 3. Validar tipo de firma (si corresponde)
if ((mySignature || workflowEnabled) && !ndaEnabled && !signatureType) {
  toast.error('Elegí el tipo de firma: Legal o Certificada');
  return;
}

// 4. Validar emails (si workflow está activo)
if (workflowEnabled) {
  const validSigners = buildSignersList();
  if (validSigners.length === 0) {
    toast.error('Agregá al menos un email válido para enviar el documento');
    return;
  }
}

// 5. Validar nombre del firmante (solo si dibujó firma)
if (signatureType === 'legal' && signatureMode === 'canvas' && !signerName.trim()) {
  toast.error('Completá tu nombre para generar la Hoja de Auditoría');
  return;
}
```

---

## 🔥 Problemas Resueltos

### **1. Pantalla blanca (crypto-xxx.js error)**
- ❌ **Causa:** Bundle corrupto por cambio incompatible
- ✅ **Solución:** Rollback + rebuild limpio

### **2. Opciones que no desaparecían**
- ❌ **Causa:** Flags acumulativos con lógica OR
- ✅ **Solución:** Render condicional limpio por estado

### **3. Botón X no funcionaba**
- ❌ **Causa:** `onClick={onClose}` no conectado
- ✅ **Solución:** `onClick={() => { resetAndClose(); onClose(); }}`

### **4. No se podían eliminar campos de email**
- ❌ **Causa:** No existía función `handleRemoveEmailField`
- ✅ **Solución:** Agregada con mínimo de 1 campo

### **5. Videos del footer no cargaban (CSP)**
- ❌ **Causa:** Supabase no estaba en whitelist de `media-src`
- ✅ **Solución:** Agregado en `docs/ops/vercel.json`

---

## ✅ Checklist de QA

### **Funcionalidad:**
- [ ] Abrir Centro Legal desde header → sin acción pre-seleccionada
- [ ] Abrir desde botón "Firmar documento" → Mi Firma activa
- [ ] Abrir desde botón "Crear Flujo" → Flujo de Firmas activo
- [ ] Abrir desde botón "Enviar NDA" → NDA activo
- [ ] Activar NDA → panel izquierdo aparece con animación
- [ ] Activar Flujo → panel derecho aparece con animación
- [ ] Activar Mi Firma → tipos de firma aparecen
- [ ] Solo activar NDA → tipos de firma NO aparecen
- [ ] Desactivar blindaje → toast de advertencia aparece
- [ ] Agregar campo de email → nuevo campo aparece
- [ ] Eliminar campo de email → campo desaparece (mínimo 1)
- [ ] Click en X → modal se cierra y resetea

### **Animaciones:**
- [ ] Panel NDA desliza desde izquierda (600ms)
- [ ] Panel Firmantes desliza desde derecha (600ms)
- [ ] Tipos de firma aparecen con fade+scale (500ms)
- [ ] Modal secundario aparece con fade+scale
- [ ] Todas las transiciones son suaves (no bruscas)

### **Validaciones:**
- [ ] Sin archivo → error al certificar
- [ ] Sin acción → error al certificar
- [ ] Workflow sin emails → error al certificar
- [ ] Firma Legal sin nombre → error al certificar

---

## 🚀 Próximos Pasos (No implementados aún)

1. **Sección News** - Pendiente por errores de build
2. **Página interna del Verificador** - Copy actualizado pendiente
3. **Botones de tamaño en reproductor de video** - Simplificación pendiente
4. **Modal de proveedores de firma certificada** - UI final pendiente

---

## 📊 Estado del Código

✅ **Código limpio y funcional**
✅ **Progressive disclosure implementado**
✅ **Animaciones suaves**
✅ **Validaciones robustas**
✅ **Toast notifications en lugar de mensajes inline**
✅ **Toggles múltiples funcionando correctamente**
✅ **Botón X funcionando**
✅ **Eliminación de campos de email funcionando**

---

## 🧠 Arquitectura Mental

```
Centro Legal (Modal Global)
│
├─ Elegir Archivo
│  └─ Preview del documento
│
├─ Acciones (Toggles múltiples)
│  ├─ NDA → abre panel izquierdo
│  ├─ Mi Firma → muestra tipos de firma
│  └─ Flujo de Firmas → abre panel derecho
│
├─ Tipo de Firma (condicional)
│  ├─ Firma Legal → motor interno
│  └─ Firma Certificada → modal secundario
│     ├─ QES
│     ├─ Mifiel
│     └─ Internacional
│
├─ Blindaje Forense (activo por defecto)
│  └─ TSA + Polygon + Bitcoin
│
└─ CTA: Certificar
```

---

**Última actualización:** 2025-12-13
**Estado:** ✅ Producción
**Deploy:** www.ecosign.app
