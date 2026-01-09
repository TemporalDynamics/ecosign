# 📊 ANÁLISIS DEL CENTRO LEGAL V2 EXISTENTE

**Fecha:** 2026-01-06  
**Archivo:** `client/src/components/LegalCenterModalV2.tsx` (2674 líneas)  
**Objetivo:** Entender flujo actual ANTES de implementar toggle de Protección

---

## 🏗️ ARQUITECTURA ACTUAL

### Componente Principal
- **Nombre:** `LegalCenterModalV2`
- **Tipo:** Modal fullscreen con grid layout 3 columnas
- **Sistema:** Basado en pasos (Step 1: Configurar, Step 2: Guardar/Descargar)

### Layout Actual

```
┌─────────────────────────────────────────────────────────────┐
│                    HEADER (Fixed Top)                        │
│  [X Close]              [Title]              [Help/Config]  │
├────────────────┬──────────────────────┬─────────────────────┤
│                │                      │                     │
│   LEFT PANEL   │   CENTER PREVIEW    │   RIGHT PANEL      │
│   (NDA)        │   (Document)        │   (Workflow)       │
│   320px        │   Flexible          │   320px            │
│   Collapsible  │   Always visible    │   Collapsible      │
│                │                      │                     │
│                │   [Protection icon]  │                     │
│                │   [File name]        │                     │
│                │   [Preview area]     │                     │
│                │                      │                     │
└────────────────┴──────────────────────┴─────────────────────┘
│                    BOTTOM ACTIONS                            │
│  [NDA] [Mi Firma] [Flujo de Firmas]  |  [CTA Principal]   │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎛️ TOGGLES ACTUALES (Bottom Actions)

### Estado del Código (línea 189-191)

```typescript
const [mySignature, setMySignature] = useState<boolean>(initialAction === 'sign');
const [workflowEnabled, setWorkflowEnabled] = useState<boolean>(initialAction === 'workflow');
const [ndaEnabled, setNdaEnabled] = useState<boolean>(initialAction === 'nda');
```

### Ubicación Visual (línea 2070-2126)

Los toggles están en la sección de "bottom actions" como **botones pill**:

```
[NDA]  [Mi Firma]  [Flujo de Firmas]
```

### Comportamiento de Cada Toggle

#### 1️⃣ NDA (línea 2070-2079)
```typescript
<button
  onClick={() => setNdaEnabled(!ndaEnabled)}
  className={ndaEnabled ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}
>
  NDA
</button>
```

**Efectos al activar:**
- ✅ Abre panel izquierdo (320px)
- ✅ Muestra editor de texto con NDA template
- ✅ Panel colapsable con transición suave
- ❌ NO muestra toast (silencioso)

**Lógica de panel:**
- Panel aparece: `ndaEnabled ? 'md:opacity-100 md:translate-x-0' : 'md:opacity-0 md:-translate-x-3'`
- Width: `leftColWidth = ndaEnabled ? '320px' : '0px'`

#### 2️⃣ Mi Firma (línea 2080-2103)
```typescript
<button
  onClick={() => {
    const newState = !mySignature;
    setMySignature(newState);
    
    if (newState && file) {
      setShowSignatureOnPreview(true);
      toast('Vas a poder firmar directamente sobre el documento.', {
        icon: '✍️',
        position: 'top-right',
        duration: 3000
      });
    }
  }}
  className={mySignature ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}
>
  Mi Firma
</button>
```

**Efectos al activar:**
- ✅ Abre modal de firma sobre el preview
- ✅ Muestra toast informativo: "Vas a poder firmar directamente sobre el documento."
- ✅ Usuario dibuja/sube firma
- ✅ Setea `userHasSignature = true` cuando termina

#### 3️⃣ Flujo de Firmas (línea 2104-2126)
```typescript
<button
  onClick={() => {
    const newState = !workflowEnabled;
    setWorkflowEnabled(newState);
    
    if (newState) {
      toast('Agregá los correos de las personas que deben firmar o recibir el documento.', {
        position: 'top-right',
        duration: 3000
      });
    }
  }}
  className={workflowEnabled ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}
>
  Flujo de Firmas
</button>
```

**Efectos al activar:**
- ✅ Abre panel derecho (320px)
- ✅ Muestra inputs para emails + configuración
- ✅ Toast: "Agregá los correos de las personas que deben firmar..."
- ✅ Panel colapsable con transición suave

**Lógica de panel:**
- Panel aparece: `workflowEnabled ? 'md:opacity-100 md:translate-x-0' : 'md:opacity-0 md:translate-x-3'`
- Width: `rightColWidth = workflowEnabled ? '320px' : '0px'`

---

## 🛡️ PROTECCIÓN ACTUAL (Forensic Config)

### Estado (línea 181-186)

```typescript
const [forensicEnabled, setForensicEnabled] = useState(true);
const [forensicConfig, setForensicConfig] = useState<ForensicConfig>({
  useLegalTimestamp: true,    // RFC 3161 TSA
  usePolygonAnchor: true,      // Polygon
  useBitcoinAnchor: true       // Bitcoin
});
```

**Default:** ✅ ON (TSA + Polygon + Bitcoin activos)

### Ubicación Visual Actual

**NO está en los toggles bottom.**  
**Está en el header del preview** (línea 1713-1723):

```typescript
<button
  onClick={() => setShowProtectionModal(true)}
  className={forensicEnabled ? 'text-gray-900' : 'text-gray-400'}
  title={forensicEnabled ? 'Protección legal activa' : 'Protección legal desactivada'}
>
  <Shield className={`w-5 h-5 ${forensicEnabled ? 'fill-gray-900' : ''}`} />
</button>
```

**Posición actual:**
```
[🛡️ Shield Icon]  [Nombre del archivo]  [Size]
```

### Modal de Protección (línea 2536-2621)

Al hacer click en el shield, abre un modal `showProtectionModal` con:

1. **Header:** "Protección Legal"
2. **Descripción:** "Triple protección internacional" (si enabled)
3. **Lista de protecciones:**
   - TSA (Sello de Tiempo RFC 3161)
   - Polygon (Registro Inmutable Digital)
   - Bitcoin (Registro Permanente Digital)
4. **Toggle bottom:** "Desactivar protección legal" / "Activar protección legal"

### Toasts de Protección (línea 2593-2612)

**Al activar:**
```typescript
toast('Activaste la protección legal que necesitás', {
  duration: 6000,
  position: 'bottom-right',
  icon: '🛡️',
})
```

**Al desactivar:**
```typescript
toast('Protección legal desactivada. Podés volver a activarla en cualquier momento.', {
  duration: 6000,
  position: 'bottom-right',
})
```

---

## 📋 FLUJO DE USUARIO (Paso a Paso)

### INICIO: Usuario Abre Centro Legal

1. Modal se abre fullscreen (3 columnas)
2. Centro muestra: "Subí o arrastrá tu documento"
3. Estados iniciales:
   - `step = 1`
   - `documentLoaded = false`
   - `forensicEnabled = true` (⚠️ default ON)
   - `ndaEnabled/mySignature/workflowEnabled` según `initialAction`

### PASO 1: Usuario Sube Documento

```typescript
const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
  const selectedFile = e.target.files?.[0];
  if (!selectedFile) return;
  
  setFile(selectedFile);
  setDocumentLoaded(true); // 🔑 KEY: Habilita acciones
  // ... resto de lógica
}
```

**Efectos:**
- ✅ Preview del documento en centro
- ✅ Shield icon visible en header (forensicEnabled = true)
- ✅ Toggles bottom se hacen visibles/activos
- ✅ `documentLoaded = true` → habilita todo

### PASO 2: Usuario Configura (Opcional)

Usuario puede activar/desactivar toggles:

#### Si activa NDA:
- Panel izquierdo se expande (320px)
- Editor de texto visible
- Usuario puede modificar NDA text

#### Si activa Mi Firma:
- Toast: "Vas a poder firmar directamente sobre el documento"
- Modal de firma aparece sobre preview
- Usuario dibuja/sube firma

#### Si activa Flujo:
- Panel derecho se expande (320px)
- Inputs para emails visibles
- Toast: "Agregá los correos..."

#### Si modifica Protección:
- Click en Shield icon → abre modal
- Usuario puede desactivar forensicEnabled
- Toast confirma cambio

### PASO 3: Usuario Confirma (CTA)

CTA dice: "Certificar documento" (o variante según config)

Al hacer click:
- ✅ Ejecuta `handleCertify()`
- ✅ Usa `forensicEnabled` + `forensicConfig` para certificación
- ✅ Persiste TSA events si `forensicEnabled = true`
- ✅ Crea document_entity con estados canónicos
- ✅ Genera .ECO / .ECOX

---

## 🔑 ESTADOS CLAVE PARA BLOQUE 1

### Estados que YA EXISTEN y podemos usar:

```typescript
// ✅ Protección existe
const [forensicEnabled, setForensicEnabled] = useState(true);

// ✅ Modal de protección existe
const [showProtectionModal, setShowProtectionModal] = useState(false);

// ✅ Config detallada existe
const [forensicConfig, setForensicConfig] = useState<ForensicConfig>({
  useLegalTimestamp: true,
  usePolygonAnchor: true,
  useBitcoinAnchor: true
});

// ✅ Draft tracking (se guarda automáticamente)
// No hay estado explícito "draft", pero el sistema guarda cambios

// ✅ Toasts system existe
import toast from 'react-hot-toast';
```

### Estados que NO NECESITAMOS crear:

- ❌ `protectionEnabled` (ya es `forensicEnabled`)
- ❌ `isDraft` (implícito en `step === 1`)
- ❌ `warningModal` (ya hay `showProtectionModal`)

---

## 🎯 LO QUE HAY QUE CAMBIAR (BLOQUE 1)

### ✅ CAMBIO 1: Mover Shield a Toggles Bottom

**Ubicación actual:**
- Header del preview (línea 1713)

**Nueva ubicación:**
- Bottom actions, entre NDA y Mi Firma

**Código a mover:**
```typescript
// ANTES (header preview):
<button onClick={() => setShowProtectionModal(true)}>
  <Shield className={forensicEnabled ? 'fill-gray-900' : ''} />
</button>

// DESPUÉS (bottom actions):
<button
  onClick={() => setForensicEnabled(!forensicEnabled)}
  className={forensicEnabled ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}
>
  Protección
</button>
```

### ✅ CAMBIO 2: Toast al Cargar Documento

**Trigger:** Cuando `documentLoaded = true` por primera vez

```typescript
// En handleFileSelect, después de setDocumentLoaded(true):
if (forensicEnabled) {
  toast('🛡️ Protección activada — Este documento quedará respaldado por EcoSign.', {
    duration: 3000,
    position: 'top-right'
  });
}
```

### ✅ CAMBIO 3: Animación del Shield al Reactivar

**Cuando:** Usuario reactiva forensicEnabled después de desactivarlo

```typescript
if (newState && !forensicEnabled) {
  // Animar shield
  // Posicionarlo a la izquierda del título
}
```

**Ubicación del shield animado:**
- A la izquierda del nombre del archivo en preview header
- Ya está ahí (línea 1713), solo falta animación

### ✅ CAMBIO 4: Modal Info (Click en Shield)

**Ya existe:** Modal de protección (línea 2536-2621)

**Ajustar copy:** Hacerlo menos técnico según BLOQUE 1

**Copy actual:**
- "Triple protección internacional"
- "Certificación RFC 3161"
- "Anclaje en la red Polygon"

**Copy nuevo:**
- "EcoSign registra este documento para que pueda verificarse en el futuro."

### ✅ CAMBIO 5: Warning al Salir sin Protección

**NO existe actualmente.**

**Agregar:** Modal que aparece cuando:
- `forensicEnabled = false`
- Usuario intenta cerrar modal o ir a Step 2

**Implementar:** Similar a `showProtectionModal` pero con copy de warning

---

## 🚫 LO QUE NO HAY QUE TOCAR

### Layout Intocable:
- ✅ Grid 3 columnas
- ✅ Panels colapsables (NDA, Workflow)
- ✅ Preview center con altura fija
- ✅ Sistema de pasos

### Toggles Existentes Intocables:
- ✅ NDA toggle y su lógica
- ✅ Mi Firma toggle y su lógica
- ✅ Flujo de Firmas toggle y su lógica

### Estados Canónicos Intocables:
- ✅ `forensicEnabled` (no renombrar)
- ✅ `forensicConfig` (no reestructurar)
- ✅ `handleCertify()` logic (no modificar)

---

## 📊 RESUMEN EJECUTIVO

### ✅ Lo que ya está bien:

1. **Protección existe y funciona** (`forensicEnabled = true` default)
2. **Modal de info existe** (`showProtectionModal`)
3. **Toasts system funciona** (react-hot-toast)
4. **Layout es correcto** (3 columnas con colapse)
5. **Toggles pattern existe** (NDA, Mi Firma, Flujo)

### 🔧 Lo que hay que agregar:

1. **Toggle "Protección" en bottom actions** (entre NDA y Mi Firma)
2. **Toast inicial** al cargar documento
3. **Animación de shield** al reactivar
4. **Warning modal** al salir sin protección
5. **Ajustar copy** del modal info (menos técnico)

### 📏 Scope Estimado:

- **Líneas a modificar:** ~50-100
- **Componentes nuevos:** 0 (solo ajustar existentes)
- **Estados nuevos:** 1 (`showUnprotectedWarning`)
- **Archivos afectados:** 1 (`LegalCenterModalV2.tsx`)

---

## 🎯 SIGUIENTE PASO

**IMPLEMENTAR BLOQUE 1** con cambios quirúrgicos:

1. Agregar toggle "Protección" (línea ~2100)
2. Agregar toast inicial (línea ~400)
3. Agregar animación shield (línea ~1713)
4. Ajustar modal info copy (línea ~2550)
5. Crear warning modal (línea ~2620)

**TOTAL:** ~5 cambios localizados, sin refactors globales.

---

**Documento generado:** 2026-01-06  
**Por:** Copilot (Análisis pre-implementación)  
**Estado:** READY TO IMPLEMENT
