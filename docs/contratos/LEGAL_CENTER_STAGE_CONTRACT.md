# 📜 CONTRATO CANÓNICO — LEGAL CENTER STAGE

**Versión:** v1.0  
**Estado:** CANÓNICO ✅  
**Fecha:** 2026-01-07  
**Scope:** Layout físico del Centro Legal  
**Normas:** MUST, SHOULD, MAY

---

## 0️⃣ PROPÓSITO

Definir el comportamiento canónico del **Legal Center Stage**, el componente de layout que garantiza un **canvas central invariante** mediante posicionamiento absoluto en viewport.

**Este contrato define:**
1. ✅ Posicionamiento físico (no flexible)
2. ✅ Overlays reales (no columnas)
3. ✅ Ancla visual inmutable
4. ✅ Responsive sin comprometer invariante

**Este contrato NO define:**
- ❌ Lógica de negocio
- ❌ Estado de documentos
- ❌ Flujos de certificación

---

## 1️⃣ PRINCIPIO RECTOR (INVARIANTE FUNDAMENTAL)

### **El Canvas es el Sol. Los overlays son planetas.**

**El Sol no se mueve cuando los planetas orbitan.**

**MUST:**
- El canvas tiene **ancho fijo pre-determinado**
- El canvas está **centrado en viewport** (absolute positioning)
- El canvas **NUNCA** cambia de tamaño por apertura de paneles
- El canvas **NO** depende de grid/flex del padre

**MUST NOT:**
- ❌ Canvas con `1fr` o valores flexibles
- ❌ Canvas en columnas de grid del padre
- ❌ Canvas afectado por siblings
- ❌ Canvas con width calculado dinámicamente

---

## 2️⃣ ARQUITECTURA DE VIEWPORT

### **Estructura:**

```
┌────────────────────────────────────────────────────────────┐
│  VIEWPORT                                                  │
│  ┌──────────────┬─────────────────────┬──────────────┐   │
│  │ Left Overlay │   CANVAS ANCHOR     │ Right Overlay│   │
│  │ (absolute)   │   (absolute, fijo)  │ (absolute)   │   │
│  │              │                     │              │   │
│  │ translateX(  │   left: 50%         │ translateX(  │   │
│  │   -100%)     │   transform:        │   100%)      │   │
│  │              │   translateX(-50%)  │              │   │
│  └──────────────┴─────────────────────┴──────────────┘   │
└────────────────────────────────────────────────────────────┘
```

**Clave:** Todo es `position: absolute` respecto al stage container.

---

## 3️⃣ CANVAS ANCHOR (Centro Inmutable)

### **3.1 Posicionamiento**

**MUST:**
```css
.legal-center-stage__canvas {
  position: absolute;
  inset: 0; /* Equivale a: top: 0; right: 0; bottom: 0; left: 0; */
  left: 50%;
  transform: translateX(-50%);
  
  /* Ancho fijo (no flexible) */
  width: min(1100px, 100vw - 80px);
  
  /* Layout interno */
  display: flex;
  flex-direction: column;
  
  /* Z-index menor que overlays */
  z-index: 10;
  
  /* Background */
  background: white;
}
```

**Explicación:**
- `left: 50%` + `translateX(-50%)` → Centrado perfecto
- `width: min(1100px, ...)` → Ancho máximo, pero responsive
- `100vw - 80px` → Margen para overlays en mobile (safe area)
- `inset: 0` → Shorthand para top/right/bottom/left (más compacto)

**MUST NOT:**
- ❌ `width: 1fr` o `flex-grow`
- ❌ `grid-column` (no está en grid)
- ❌ `position: relative` (debe ser absolute)

---

### **3.2 Valores de Ancho (Desktop)**

**SHOULD:**
```css
/* Desktop (ideal) */
@media (min-width: 1440px) {
  .legal-center-stage__canvas {
    width: 1100px; /* Ancho fijo óptimo */
  }
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1439px) {
  .legal-center-stage__canvas {
    width: min(900px, 100vw - 120px);
  }
}

/* Mobile (ver sección 5) */
```

**Razón:** Garantiza legibilidad sin comprimir contenido.

**Nota futura:** Convertir a tokens CSS cuando sea producto grande:
```css
width: min(var(--canvas-max, 1100px), 100vw - var(--canvas-margin, 80px));
```

---

## 4️⃣ OVERLAYS LATERALES (Paneles Independientes)

### **4.1 Left Overlay (NDA)**

**MUST:**
```css
.legal-center-stage__left-overlay {
  position: absolute;
  inset: 0;
  right: auto; /* Solo left + width */
  width: 320px;
  
  /* Estado por defecto: oculto */
  transform: translateX(-100%);
  transition: transform 400ms cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Z-index sobre canvas */
  z-index: 20;
  
  /* Estilo */
  background: var(--gray-50, #f9fafb);
  border-right: 1px solid var(--gray-200, #e5e7eb);
  
  /* Scroll interno */
  overflow-y: auto;
  overflow-x: hidden;
}

.legal-center-stage__left-overlay.open {
  transform: translateX(0); /* Entra desde izquierda */
}
```

**Comportamiento:**
- Entra/sale desde fuera del viewport
- **NO empuja** el canvas
- **NO afecta** el layout del canvas
- Animación suave (400ms mínimo)

---

### **4.2 Right Overlay (Flujo de Firmas)**

**MUST:**
```css
.legal-center-stage__right-overlay {
  position: absolute;
  inset: 0;
  left: auto; /* Solo right + width */
  width: 360px;
  
  /* Estado por defecto: oculto */
  transform: translateX(100%);
  transition: transform 400ms cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Z-index sobre canvas */
  z-index: 20;
  
  /* Estilo */
  background: var(--gray-50, #f9fafb);
  border-left: 1px solid var(--gray-200, #e5e7eb);
  
  /* Scroll interno */
  overflow-y: auto;
  overflow-x: hidden;
}

.legal-center-stage__right-overlay.open {
  transform: translateX(0); /* Entra desde derecha */
}
```

---

### **4.3 Comportamiento de Overlays**

**MUST:**
- Overlays **NO** afectan `width` del canvas
- Overlays **NO** cambian `position` del canvas
- Overlays pueden superponerse al canvas (aceptable en viewports pequeños)

**SHOULD:**
- Backdrop semi-transparente cuando overlay abierto (mobile)
- Click en backdrop cierra overlay (UX)

---

## 5️⃣ RESPONSIVE (Mobile)

### **5.1 Estrategia v1: Drawers con Backdrop**

**MUST (Implementación inicial):**
```css
@media (max-width: 768px) {
  /* Canvas sale del absolute, pasa a flow */
  .legal-center-stage__canvas {
    position: relative;
    left: auto;
    transform: none;
    width: 100%;
  }
  
  /* Overlays pasan a full-width absolute (drawers) */
  .legal-center-stage__left-overlay,
  .legal-center-stage__right-overlay {
    width: 90vw;
    max-width: 400px;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
  }
  
  /* Backdrop obligatorio en mobile */
  .legal-center-stage__backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 15;
  }
}
```

**Comportamiento Mobile v1:**
- Canvas ocupa 100% del ancho
- Overlays son "drawers" con backdrop
- Un solo overlay visible a la vez (recomendado)

---

### **5.2 Estrategia v2: Acordeón Stacked (Opcional, futuro)**

**MAY (Si UX lo requiere más adelante):**
```css
@media (max-width: 768px) {
  .legal-center-stage {
    display: flex;
    flex-direction: column;
  }
  
  .legal-center-stage__canvas,
  .legal-center-stage__left-overlay,
  .legal-center-stage__right-overlay {
    position: relative;
    width: 100%;
    transform: none;
  }
}
```

**Cuándo considerar v2:**
- Viewports muy pequeños (<600px)
- Formularios largos que necesitan scroll
- Feedback de usuarios

**Decisión inicial:** v1 (drawers) es suficiente y más simple.

---

## 6️⃣ STAGE CONTAINER (Wrapper)

### **6.1 Stage Base**

**MUST:**
```css
.legal-center-stage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden; /* Evita scroll horizontal por overlays */
}
```

**Propósito:**
- Contexto para `position: absolute` de hijos
- Contiene todo el layout
- NO tiene grid, NO tiene flex (en desktop)

---

### **6.2 Props del Componente**

**Interface:**
```typescript
interface LegalCenterStageProps {
  // Contenido del canvas central (FIJO)
  canvas: React.ReactNode;
  
  // Overlays (opcionales)
  leftOverlay?: React.ReactNode;
  rightOverlay?: React.ReactNode;
  
  // Estado de apertura
  leftOpen?: boolean;
  rightOpen?: boolean;
  
  // Backdrop (mobile)
  showBackdrop?: boolean;
  onBackdropClick?: () => void;
}
```

**MUST:**
- `canvas` es **requerido** (siempre presente)
- Overlays son **opcionales** (undefined → no renderiza)
- Stage **NO** tiene lógica de negocio (solo renderiza)
- Stage **NO** usa hooks de contexto
- Stage **NO** calcula scenes

**MUST NOT:**
- ❌ Leer estado global
- ❌ Usar `useState` para lógica de negocio
- ❌ Resolver scenes (eso es del orquestador)
- ❌ Tener dependencias de `LegalCenterShell`

---

## 7️⃣ ANIMACIONES

### **7.1 Timing**

**MUST:**
```css
transition: transform 400ms cubic-bezier(0.4, 0, 0.2, 1);
```

**Razón:**
- 400ms mínimo (visible, no instantáneo)
- `cubic-bezier(0.4, 0, 0.2, 1)` → Easing suave (Material Design)

**MUST NOT:**
- ❌ Transiciones < 300ms (demasiado rápido)
- ❌ `linear` easing (robótico)
- ❌ Animaciones en `width` o `left` del canvas

---

### **7.2 Reducción de Movimiento**

**MUST:**
```css
@media (prefers-reduced-motion: reduce) {
  .legal-center-stage__left-overlay,
  .legal-center-stage__right-overlay {
    transition: none;
  }
}
```

**Accesibilidad:** Respeta preferencias del usuario.

---

## 8️⃣ Z-INDEX HIERARCHY

**MUST:**
```
┌─────────────────────────────────┐
│ Modales internos      z: 30     │
│ Overlays              z: 20     │
│ Backdrop (mobile)     z: 15     │
│ Canvas                z: 10     │
└─────────────────────────────────┘
```

**Razón:**
- Canvas siempre visible (base)
- Backdrop cubre canvas en mobile
- Overlays sobre backdrop
- Modales (Firma, Protección) sobre todo

---

## 9️⃣ INVARIANTES DE TEST

### **Test 1: Canvas Inmutable (Crítico)**

```bash
# DevTools → Inspector → .legal-center-stage__canvas
1. Anotar computed width: _____px
2. Abrir left overlay → width DEBE SER IDÉNTICO
3. Abrir right overlay → width DEBE SER IDÉNTICO
4. Abrir ambos → width DEBE SER IDÉNTICO
5. Cerrar ambos → width DEBE SER IDÉNTICO
```

**✅ PASS:** Width constante en todos los estados  
**❌ FAIL:** Width cambia aunque sea 1px

**Si falla este test → el PR se rechaza.**

---

### **Test 2: Posición Inmutable**

```bash
# DevTools → Inspector → .legal-center-stage__canvas
1. Anotar computed left: _____px
2. Abrir/cerrar overlays → left DEBE SER IDÉNTICO
```

**✅ PASS:** `left` constante (50%)  
**❌ FAIL:** `left` cambia

---

### **Test 3: Overlays No Empujan**

```bash
# Visual test
1. Abrir left overlay
   → Debe entrar SOBRE el canvas (no empujarlo)
2. Canvas NO debe moverse horizontalmente
3. Overlay debe entrar suavemente (no snap)
```

**✅ PASS:** Canvas quieto, overlay entra suavemente  
**❌ FAIL:** Canvas se mueve o overlay aparece instantáneamente

---

## 🔟 SEPARACIÓN DE CONCERNS

### **Lo que Stage HACE:**
- ✅ Define posiciones físicas (absolute)
- ✅ Renderiza estructura HTML
- ✅ Aplica animaciones CSS
- ✅ Responsive automático (media queries)

### **Lo que Stage NO HACE:**
- ❌ NO resuelve scenes
- ❌ NO maneja estado de documentos
- ❌ NO tiene lógica de negocio
- ❌ NO conoce NDA, Flujo, Firma
- ❌ NO lee contexto global
- ❌ NO calcula nada

**Stage es un componente presentacional puro.**

---

## 1️⃣1️⃣ ESTRUCTURA DE ARCHIVOS

**MUST crear exactamente:**
```
client/src/components/centro-legal/stage/
├── LegalCenterStage.tsx    ← Componente tonto
├── LegalCenterStage.css    ← Layout puro
└── index.ts                ← Export
```

**MUST NOT:**
- ❌ Más archivos en esta carpeta
- ❌ Imports de `LegalCenterShell`
- ❌ Imports de `SceneRenderer`
- ❌ Dependencias de orquestación

**Razón:** Stage es self-contained.

---

## 1️⃣2️⃣ TEST OBLIGATORIO PRE-INTEGRACIÓN

**MUST ejecutar este test antes de integrar contenido real:**

```tsx
<LegalCenterStage
  canvas={
    <div style={{ background: 'blue', height: '100%', padding: '20px' }}>
      CANVAS FIJO
    </div>
  }
  leftOverlay={
    <div style={{ background: 'red', height: '100%', padding: '20px' }}>
      LEFT OVERLAY
    </div>
  }
  rightOverlay={
    <div style={{ background: 'green', height: '100%', padding: '20px' }}>
      RIGHT OVERLAY
    </div>
  }
  leftOpen={true}
  rightOpen={false}
/>
```

**Criterios de aceptación:**
1. ✅ Canvas azul NO se mueve al abrir left
2. ✅ Canvas azul NO se mueve al abrir right
3. ✅ Width del canvas idéntico en todos los estados
4. ✅ Overlays entran suavemente (400ms visible)

**Si este test pasa → Stage es correcto.**  
**Si falla → NO integrar contenido real aún.**

---

## 1️⃣3️⃣ ORDEN DE IMPLEMENTACIÓN

**PASO 1: Archivos Base** (15 min)
```bash
# Crear estructura
mkdir -p client/src/components/centro-legal/stage
touch client/src/components/centro-legal/stage/LegalCenterStage.tsx
touch client/src/components/centro-legal/stage/LegalCenterStage.css
touch client/src/components/centro-legal/stage/index.ts
```

**PASO 2: CSS Básico** (30 min)
- Stage container
- Canvas anchor (absolute + centered)
- Overlays (absolute + hidden)
- Animaciones

**PASO 3: Componente TSX** (15 min)
- Interface props
- Renderizado condicional overlays
- ClassNames dinámicos (open/hidden)

**PASO 4: Test con colores** (10 min)
- Crear TestStagePage.tsx (temporal)
- Divs de colores
- Validar invariantes (Test 1, 2, 3)

**PASO 5: Integración real** (30 min)
- Solo si Test 1, 2, 3 pasan
- Reemplazar divs por contenido real
- Re-validar invariantes

**Tiempo total estimado:** ~2 horas (sin contenido real)

---

## 1️⃣4️⃣ REGLA DE ORO FINAL

> **"El Canvas es el Sol. Los overlays son planetas.**  
> **El Sol no se mueve cuando los planetas orbitan."**

**Esto NO es metáfora. Es arquitectura.**

Si el canvas se mueve → la arquitectura falló.

---

## ✅ COMPLIANCE CHECKLIST

### Para validar implementación:

- [ ] Canvas tiene `position: absolute`
- [ ] Canvas tiene `left: 50%` + `translateX(-50%)`
- [ ] Canvas tiene ancho fijo (no `1fr`)
- [ ] Overlays tienen `position: absolute`
- [ ] Overlays usan `transform: translateX()` (no width)
- [ ] Transiciones de 400ms o más
- [ ] Easing suave (cubic-bezier)
- [ ] Mobile usa relative positioning (v1: drawers)
- [ ] Stage NO tiene grid/flex (desktop)
- [ ] Stage NO tiene lógica de negocio
- [ ] Test 1 (Canvas Inmutable) pasa
- [ ] Test 2 (Posición Inmutable) pasa
- [ ] Test 3 (Overlays No Empujan) pasa

---

## 📊 COMPARACIÓN CON APPROACH ANTERIOR

| Aspecto | Grid Approach | Stage Approach |
|---------|---------------|----------------|
| Canvas width | `1fr` (flexible) | `1100px` (fijo) |
| Canvas position | grid-column | absolute |
| Overlays | Columnas grid | Absolute + transform |
| Afecta canvas? | ✅ Sí (achica) | ❌ No (independiente) |
| Responsive | Media queries en grid | Media queries en positions |
| Complejidad | Alta (conflicto con padre) | Baja (self-contained) |
| Testeable? | ❌ Difícil (grids anidados) | ✅ Fácil (invariantes claros) |

**Winner:** Stage Approach (garantiza invariante)

---

## 🚫 ANTI-PATTERNS (Prohibido)

**MUST NOT hacer esto:**

```tsx
// ❌ MAL: Stage con lógica
const LegalCenterStage = () => {
  const [ndaOpen, setNdaOpen] = useState(false); // ❌
  const scene = resolveScene(...); // ❌
  
  // Stage NO decide, solo renderiza
}

// ❌ MAL: Stage con grid
<div className="stage" style={{ display: 'grid' }}> {/* ❌ */}

// ❌ MAL: Canvas flexible
<div className="canvas" style={{ width: '1fr' }}> {/* ❌ */}

// ❌ MAL: Overlays con width dinámico
<div className="overlay" style={{ 
  width: ndaOpen ? '320px' : '0px' // ❌ Usar transform
}}>
```

**Estos patterns rompen el invariante.**

---

**Documento:** Contrato de Layout — Legal Center Stage  
**Estado:** CANÓNICO v1.0 ✅  
**Aprobación:** FORMAL  
**Fecha:** 2026-01-07  
**Próxima revisión:** Post-implementación (validación visual)

---

**Este contrato reemplaza definitivamente el approach de Grid.**  
**Implementar exactamente como se especifica.**  
**No interpretar. No improvisar. Solo ejecutar.**

🎯
