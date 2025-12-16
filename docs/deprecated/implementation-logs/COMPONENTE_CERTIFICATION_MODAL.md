# Componente: CertificationModal

**Versión**: 1.0
**Fecha**: 2025-11-18
**Estado**: ✅ Implementado
**Ubicación**: `client/src/components/CertificationModal.jsx`

---

## 🎯 DESCRIPCIÓN

Modal moderno de certificación de documentos con diseño según el Design System de VerifySign.

### Características principales:
- ✅ **Flujo simplificado en 3 pasos** (Elegí → Firmá → Listo)
- ✅ **Paneles colapsables** para opciones avanzadas
- ✅ **Blindaje forense por defecto** (transparente para el usuario)
- ✅ **Sin tecnicismos** en la UI visible
- ✅ **Canvas de firma** con soporte touch y mouse
- ✅ **Drag & drop** para subir archivos
- ✅ **Integración completa** con backend (Supabase + certificación)

---

## 📋 ESTRUCTURA DEL COMPONENTE

### **Paso 1: Elegir archivo**
```
┌─────────────────────────────────────┐
│ Elegí tu archivo                    │
│                                     │
│ ┌───────────────────────────────┐   │
│ │   [Drop zone con icono]       │   │
│ │   Arrastrá o hacé clic        │   │
│ └───────────────────────────────┘   │
│                                     │
│ ▼ Blindaje forense                  │ ← Panel colapsable
│   ├─ [✓] Timestamp legal            │
│   ├─ [✓] Registro blockchain        │
│   └─ [ ] Registro en Bitcoin        │
│                                     │
│ [Siguiente]                         │
└─────────────────────────────────────┘
```

### **Paso 2: Firmar (opcional)**
```
┌─────────────────────────────────────┐
│ Firma legal (opcional)              │
│                                     │
│ ○ Solo certificación (sin firma)    │
│ ○ Firma legal con SignNow           │
│ ○ Firma manual simple               │
│                                     │
│ [Canvas de firma si se selecciona]  │
│                                     │
│ [Atrás] [Certificar]                │
└─────────────────────────────────────┘
```

### **Paso 3: Listo**
```
┌─────────────────────────────────────┐
│     ✓ Tu certificado está listo     │
│                                     │
│  Guardamos tu documento original    │
│  y tu certificado .ECO en tu cuenta │
│                                     │
│  [Descargar .ECO]                   │
│  [Ver en mi panel]                  │
└─────────────────────────────────────┘
```

---

## 🔧 USO DEL COMPONENTE

### Ejemplo básico:
```jsx
import CertificationModal from '../components/CertificationModal';

function MyPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Certificar documento
      </button>

      <CertificationModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
```

### Props:
| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `isOpen` | `boolean` | ✅ | Controla si el modal está visible |
| `onClose` | `function` | ✅ | Callback cuando se cierra el modal |

---

## 🎨 PANELES COLAPSABLES

### Panel: Blindaje Forense

**Estado por defecto**: Cerrado
**Opciones**:
- ✅ **Timestamp legal** (RFC 3161) - Activado por defecto
- ✅ **Registro blockchain** (Polygon) - Activado por defecto
- ☐ **Registro en Bitcoin** (OpenTimestamps) - Opcional

**Configuración en estado**:
```javascript
const [forensicConfig, setForensicConfig] = useState({
  useLegalTimestamp: true,    // RFC 3161 - gratis
  usePolygonAnchor: true,      // Polygon - $0.001
  useBitcoinAnchor: false      // Bitcoin - opcional (24h)
});
```

---

## 🖊️ CANVAS DE FIRMA

### Hook personalizado: `useSignatureCanvas`

**Ubicación**: `client/src/hooks/useSignatureCanvas.js`

**Características**:
- ✅ Soporte mouse y touch
- ✅ Responsive (ajusta a devicePixelRatio)
- ✅ Botón limpiar integrado
- ✅ Export a base64 PNG

**Uso**:
```javascript
import { useSignatureCanvas } from '../hooks/useSignatureCanvas';

const { canvasRef, hasSignature, clearCanvas, getSignatureData, handlers } = useSignatureCanvas();

// En el render:
<canvas
  ref={canvasRef}
  className="w-full h-32 border cursor-crosshair"
  {...handlers}
/>
<button onClick={clearCanvas}>Limpiar</button>

// Al enviar:
const signatureData = getSignatureData(); // PNG base64
```

---

## 🔄 FLUJO DE CERTIFICACIÓN

### 1. Usuario selecciona archivo
```javascript
handleFileSelect(event) → setFile(file)
```

### 2. Usuario configura blindaje (opcional)
```javascript
setForensicConfig({ ...config })
```

### 3. Usuario elige modo de firma (opcional)
```javascript
setSignatureMode('none' | 'canvas' | 'signnow')
```

### 4. Click en "Certificar"
```javascript
handleCertify() →
  1. getSignatureData() (si modo canvas)
  2. basicCertificationWeb(file, options)
  3. saveUserDocument(file, ecoData)
  4. setCertificateData(result)
  5. setStep(3) // Ir a "Listo"
```

### 5. Descargar o ver en panel
```javascript
resetAndClose() →
  - Limpia estados
  - Llama onClose()
  - Parent refresca documentos
```

---

## 🎨 DISEÑO Y UX

### Principios aplicados (Design System):

1. **❌ Sin tecnicismos**:
   - No se muestra "hash", "criptografía", "firma Ed25519"
   - Solo lenguaje humano: "Certificar", "Blindaje forense", "Firma legal"

2. **✅ Blindaje transparente**:
   - Por defecto ya incluye timestamp + blockchain
   - Usuario no necesita entender qué es RFC 3161
   - Solo ve "Timestamp legal (recomendado)"

3. **✅ Pasos claros**:
   - Progress bar visual (1 → 2 → 3)
   - Un paso a la vez, sin saturar
   - Botones "Siguiente" / "Atrás" claros

4. **✅ Feedback visual**:
   - Loading spinner mientras certifica
   - Checkmark verde al completar
   - Estados hover en todos los botones

### Colores (Tailwind):
- **Primario**: `cyan-600` (botones principales)
- **Hover primario**: `cyan-700`
- **Secundario**: `gray-600` (texto secundario)
- **Success**: `green-500` (checkmarks)
- **Bordes**: `gray-200` / `gray-300`

---

## 📦 DEPENDENCIAS

### React Hooks:
- `useState` - Manejo de estado local
- `useEffect` - (en useSignatureCanvas)
- `useRef` - (en useSignatureCanvas)

### Librerías externas:
- `lucide-react` - Iconos
- `basicCertificationWeb` - Certificación forense
- `saveUserDocument` - Guardado en Supabase

### Componentes personalizados:
- Ninguno (componente standalone)

---

## 🧪 TESTING

### Checklist manual:

**Paso 1 - Archivo**:
- [ ] Drop zone acepta archivos
- [ ] Muestra nombre y tamaño del archivo
- [ ] Botón "Siguiente" se habilita solo con archivo
- [ ] Panel de blindaje se abre/cierra
- [ ] Checkboxes funcionan correctamente

**Paso 2 - Firma**:
- [ ] Radio buttons seleccionan modo
- [ ] Canvas aparece en modo "manual"
- [ ] Canvas permite dibujar
- [ ] Botón "Limpiar" funciona
- [ ] Botón "Atrás" vuelve al paso 1
- [ ] Botón "Certificar" inicia proceso

**Paso 3 - Listo**:
- [ ] Muestra checkmark verde
- [ ] Botón "Descargar .ECO" funciona
- [ ] Botón "Ver en panel" cierra y refresca

**Generales**:
- [ ] Modal se cierra con X
- [ ] Modal se cierra con "Ver en panel"
- [ ] States se resetean al cerrar
- [ ] Funciona en mobile (touch)
- [ ] Funciona en desktop (mouse)

---

## 🚀 MEJORAS FUTURAS

### v1.1 - Firma con SignNow:
- [ ] Integración real con API de SignNow
- [ ] Modal de autenticación SignNow
- [ ] Flujo de firma legal completo

### v1.2 - Compartir directo:
- [ ] Panel colapsable "Compartir"
- [ ] Generación de link NDA
- [ ] Smart paste de emails para workflow

### v1.3 - Preview del documento:
- [ ] Vista previa del PDF en paso 1
- [ ] Miniatura del documento en step indicator
- [ ] Zoom y scroll en preview

---

## 📚 ARCHIVOS RELACIONADOS

```
client/src/
├── components/
│   └── CertificationModal.jsx       ✅ Componente principal
├── hooks/
│   └── useSignatureCanvas.js        ✅ Hook de firma
├── lib/
│   ├── basicCertificationWeb.js     ← Certificación forense
│   └── polygonAnchor.js             ← Anchoring blockchain
└── utils/
    └── documentStorage.js           ← Guardado en Supabase
```

---

## 🔗 ENLACES

- **Design System**: `/docs/DESIGN_SYSTEM.md`
- **Mandamientos UI**: `/docs/AUDITORIA_UI_MANDAMIENTOS.md`
- **Workflows**: `/docs/DECISIONES_PRODUCTO_WORKFLOW.md`

---

**Última actualización**: 2025-11-18
**Versión**: 1.0
**Estado**: ✅ Listo para uso en producción
