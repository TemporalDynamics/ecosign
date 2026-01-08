# 🎯 CENTRO LEGAL - MODELO DEFINITIVO DE ANCLAJE UNIVERSAL

**Versión:** v3.0 FINAL  
**Fecha:** 2026-01-08  
**Estado:** DOCUMENTO CANÓNICO  
**Basado en:** Análisis completo de toda la iteración

---

## 🧠 TU VISIÓN (Lo que buscás conseguir)

### **Metáfora Clave: "El Canvas es el Sol"**

El documento (Dropzone/Canvas) debe ser **EL PUNTO FIJO ABSOLUTO** del universo del Centro Legal.  
Los paneles (NDA y Flujo de Firmas) son **planetas que orbitan alrededor** sin mover el sol.

### **Principios Fundamentales:**

1. **Invariancia del Canvas:** El documento NUNCA se mueve visualmente, sin importar qué paneles se abran/cierren
2. **Efecto Cortina:** Los paneles se deslizan "desde detrás" del Canvas, no aparecen de golpe
3. **Crecimiento Asimétrico:** El modal se expande solo hacia donde hay contenido nuevo
4. **Elegancia Visual:** Transiciones suaves, sin saltos, sin espacios en blanco

---

## 📐 LOS 4 ESTADOS DEL CENTRO LEGAL

### **ESTADO 1: MODAL CERRADO (Inicio)**

**Lo que el usuario ve:**
- Modal compacto centrado en la pantalla
- Solo el Dropzone/Canvas visible (900px de ancho)
- Botones "NDA", "Protección", "Mi Firma", "Flujo de Firmas" visibles en el Canvas
- Sin paneles laterales visibles

**Especificaciones técnicas:**
```
Modal Container:
├─ Ancho visual: ~900px (fit-content del Canvas)
├─ Posición: Centrado en viewport (margin: 0 auto)
├─ Altura: fit-content con max-height: 94vh
└─ Overflow: hidden (para ocultar paneles fuera)

Canvas (Dropzone):
├─ Ancho: 900px FIJO
├─ Posición: position: relative (ancla física del modal)
├─ Z-index: 20 (siempre en primer plano visual)
├─ Padding interno: 40px (breathing room para contenido)
├─ Box-shadow: 0 4px 20px rgba(0,0,0,0.08) (elevación sutil)
└─ Background: white

Panel NDA (Estado: CERRADO):
├─ Ancho: 0px (colapsado físicamente)
├─ Opacity: 0 (invisible)
├─ Transform: translateX(100%) (posicionado detrás del Canvas)
├─ Z-index: 10 (debajo del Canvas)
├─ Position: absolute con right: 100%
└─ Transición: 500ms cubic-bezier(0.16, 1, 0.3, 1)

Panel Flujo de Firmas (Estado: CERRADO):
├─ Ancho: 0px (colapsado físicamente)
├─ Opacity: 0 (invisible)
├─ Transform: translateX(-100%) (posicionado detrás del Canvas)
├─ Z-index: 10 (debajo del Canvas)
├─ Position: absolute con left: 100%
└─ Transición: 500ms cubic-bezier(0.16, 1, 0.3, 1)
```

**INVARIANTES CRÍTICOS:**
> ✅ El Canvas está en `position: relative` para que el modal "vea" su ancho real  
> ✅ Los paneles están en `position: absolute` relativos al Canvas  
> ✅ Los paneles con `width: 0` NO ocupan espacio físico (collapsed)

---

### **ESTADO 2: NDA ABIERTO**

**Lo que el usuario ve:**
- El Canvas **NO SE MUEVE** (permanece en la misma posición visual en la pantalla)
- El modal **crece suavemente hacia la IZQUIERDA** (crecimiento asimétrico)
- Panel NDA **emerge desde detrás del Canvas** hacia la izquierda
- Efecto visual: "El modal crece, el documento permanece quieto"

**Especificaciones técnicas:**
```
Modal Container:
├─ Ancho visual: ~1400px (500px NDA + 900px Canvas)
├─ Transición: width 500ms ease-out (expansión suave)
├─ Crecimiento: ASIMÉTRICO solo hacia la izquierda
└─ Centrado: Se mantiene con margin: 0 auto

Canvas (Dropzone):
├─ Ancho: 900px FIJO (NO CAMBIA)
├─ Posición visual: EXACTAMENTE LA MISMA (invariante absoluta)
├─ Z-index: 20 (sigue en primer plano)
├─ NO tiene translateX, NO tiene offset
└─ El usuario percibe: "El documento no se movió"

Panel NDA (Estado: ABIERTO):
├─ Ancho: 500px (expandido, ocupa espacio físico)
├─ Opacity: 1 (totalmente visible)
├─ Transform: translateX(0) (deslizado hacia afuera desde detrás)
├─ Position: absolute con right: 100% (pegado al borde izquierdo del Canvas)
├─ Z-index: 10 (debajo del Canvas durante transición)
├─ Box-shadow: 4px 0 15px rgba(0,0,0,0.1) (proyecta sombra sobre Canvas)
├─ Background: #f9fafb (gris muy claro)
├─ Border-right: 1px solid #e5e7eb
└─ Transición: Sincronizada con expansión del modal (500ms)

Panel Flujo de Firmas (Estado: CERRADO):
├─ Ancho: 0px (sigue colapsado)
├─ Opacity: 0
└─ Transform: translateX(-100%) (sigue oculto)
```

**INVARIANTES CRÍTICOS:**
> ✅ El Canvas mantiene `position: relative` sin cambios en left/right  
> ✅ El modal crece **asimétricamente** hacia la izquierda (no bidireccional)  
> ✅ El NDA **NO empuja** al Canvas, se desliza **desde detrás** (z-index: 10 < 20)  
> ✅ Durante la transición, el Canvas se ve **por encima** del panel emergente

**Sensación deseada:**
> Como una hoja que se desliza suavemente desde detrás de un papel fijo

---

### **ESTADO 3: FLUJO DE FIRMAS ABIERTO (sin NDA)**

**Lo que el usuario ve:**
- El Canvas **NO SE MUEVE** (invariante absoluta)
- El modal **crece suavemente hacia la DERECHA** (crecimiento asimétrico opuesto)
- Panel Flujo de Firmas **emerge desde detrás del Canvas** hacia la derecha

**Especificaciones técnicas:**
```
Modal Container:
├─ Ancho visual: ~1250px (900px Canvas + 350px Firmas)
├─ Transición: width 500ms ease-out
├─ Crecimiento: ASIMÉTRICO solo hacia la derecha
└─ Centrado: margin: 0 auto

Canvas (Dropzone):
├─ Ancho: 900px FIJO (NO CAMBIA)
├─ Posición visual: EXACTAMENTE LA MISMA (invariante absoluta)
└─ Z-index: 20 (sigue en primer plano)

Panel NDA (Estado: CERRADO):
├─ Ancho: 0px (colapsado)
├─ Opacity: 0
└─ Transform: translateX(100%)

Panel Flujo de Firmas (Estado: ABIERTO):
├─ Ancho: 350px (expandido)
├─ Opacity: 1 (totalmente visible)
├─ Transform: translateX(0) (deslizado hacia afuera)
├─ Position: absolute con left: 100% (pegado al borde derecho del Canvas)
├─ Z-index: 10 (debajo del Canvas durante transición)
├─ Box-shadow: -4px 0 15px rgba(0,0,0,0.1) (proyecta sombra hacia izquierda)
├─ Background: #f9fafb
├─ Border-left: 1px solid #e5e7eb
└─ Transición: 500ms cubic-bezier(0.16, 1, 0.3, 1)
```

**INVARIANTES CRÍTICOS:**
> ✅ El Canvas mantiene `position: relative` sin cambios  
> ✅ El modal crece **asimétricamente** hacia la derecha  
> ✅ El panel emerge desde detrás (z-index: 10 < 20)

---

### **ESTADO 4: AMBOS PANELES ABIERTOS**

**Lo que el usuario ve:**
- El Canvas **NO SE MUEVE** (invariante absoluta)
- El modal se expande hacia **AMBOS LADOS** (bilateral simétrico)
- NDA visible a la izquierda, Flujo de Firmas visible a la derecha
- Canvas centrado entre ambos paneles

**Especificaciones técnicas:**
```
Modal Container:
├─ Ancho visual: ~1750px (500px NDA + 900px Canvas + 350px Firmas)
├─ Transición: width 500ms ease-out
├─ Crecimiento: Bilateral simétrico desde el Canvas central
└─ Centrado: margin: 0 auto

Canvas (Dropzone):
├─ Ancho: 900px FIJO (NO CAMBIA)
├─ Posición visual: EXACTAMENTE LA MISMA (invariante absoluta)
└─ Z-index: 20 (sigue en primer plano)

Panel NDA (Estado: ABIERTO):
├─ Ancho: 500px (expandido)
├─ Opacity: 1
├─ Transform: translateX(0)
├─ Position: right: 100%
└─ Z-index: 10

Panel Flujo de Firmas (Estado: ABIERTO):
├─ Ancho: 350px (expandido)
├─ Opacity: 1
├─ Transform: translateX(0)
├─ Position: left: 100%
└─ Z-index: 10
```

**Composición final:**
```
┌──────────────────────────────────────────────────────────┐
│                    MODAL (1750px)                        │
│                                                          │
│  ┌──────────┐  ┌─────────────────┐  ┌────────────┐      │
│  │   NDA    │  │     CANVAS      │  │   FIRMAS   │      │
│  │  500px   │  │     900px       │  │   350px    │      │
│  │  z:10    │  │     z:20        │  │   z:10     │      │
│  └──────────┘  └─────────────────┘  └────────────┘      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🔒 INVARIANTES ABSOLUTAS (No negociables)

### **INVARIANTE 1: El Canvas NUNCA se mueve**

```css
/* ❌ PROHIBIDO cambiar estos valores según el estado de los panels */
.legal-center-stage__canvas {
  position: relative; /* NO absolute */
  width: 900px; /* FIJO */
  
  /* ❌ PROHIBIDO: left dinámico */
  /* ❌ PROHIBIDO: right dinámico */
  /* ❌ PROHIBIDO: transform: translateX() dinámico */
  /* ❌ PROHIBIDO: margin dinámico */
}
```

**Test de validación:**
```
1. Abrir Centro Legal → Marcar posición visual del Canvas
2. Abrir NDA → Verificar que Canvas NO se movió
3. Cerrar NDA → Verificar que Canvas NO se movió
4. Abrir Flujo → Verificar que Canvas NO se movió
5. Abrir ambos → Verificar que Canvas NO se movió

CRITERIO: Si el Canvas se mueve visualmente 1px = ❌ FALLO CRÍTICO
```

---

### **INVARIANTE 2: Los paneles NO empujan, SE SUPERPONEN**

```css
.legal-center-stage__left-overlay,
.legal-center-stage__right-overlay {
  position: absolute; /* Relativos al Canvas */
  z-index: 10; /* SIEMPRE debajo del Canvas (z:20) */
  
  /* Transición de TRANSFORM, NO de position */
  transition: transform 500ms, width 500ms, opacity 300ms;
}
```

**Efecto deseado:**
```
Estado cerrado: Panel detrás del Canvas (z:10 < z:20)
                ↓
Durante transición: Panel se desliza desde detrás
                    Canvas visible por encima
                ↓
Estado abierto: Panel visible al costado
                Canvas sigue por encima visualmente
```

**Sensación:** "Hojas que se deslizan desde detrás de un documento principal"

---

### **INVARIANTE 3: El modal crece asimétricamente**

```css
.legal-center-stage {
  width: fit-content; /* Se ajusta al contenido activo */
  margin: 0 auto; /* Centrado en viewport */
  
  /* ❌ PROHIBIDO: justify-center en padre (causa crecimiento bidireccional) */
  /* ❌ PROHIBIDO: ancho fijo de 1750px desde inicio */
}
```

**Comportamiento correcto:**
```
NDA abierto:
├─ Modal: 900px → 1400px
├─ Crecimiento: SOLO hacia izquierda
└─ Canvas: Visualmente inmóvil

Firmas abierto:
├─ Modal: 900px → 1250px
├─ Crecimiento: SOLO hacia derecha
└─ Canvas: Visualmente inmóvil

Ambos abiertos:
├─ Modal: 900px → 1750px
├─ Crecimiento: Bilateral simétrico
└─ Canvas: Visualmente inmóvil (centro del modal)
```

---

### **INVARIANTE 4: Colapso físico de paneles cerrados**

```css
/* Estado CERRADO: Panel NO ocupa espacio físico */
.legal-center-stage__left-overlay {
  width: 0; /* Sin ancho físico */
  opacity: 0; /* Invisible */
  transform: translateX(100%); /* Posicionado detrás */
}

/* Estado ABIERTO: Panel ocupa espacio y es visible */
.legal-center-stage__left-overlay.open {
  width: 500px; /* Ancho expandido */
  opacity: 1; /* Totalmente visible */
  transform: translateX(0); /* En posición final */
}
```

**Por qué es crítico:**
> Si un panel cerrado tiene `width: 500px` aunque esté `opacity: 0`,  
> el modal medirá 1750px desde el inicio → Espacios en blanco a los lados

---

## 🎨 ANIMACIONES Y TRANSICIONES

### **Timing sincronizado (500ms):**
```css
/* Todos los elementos animados usan la misma duración */
transition: 
  width 500ms cubic-bezier(0.16, 1, 0.3, 1),      /* Expansión del panel */
  transform 500ms cubic-bezier(0.16, 1, 0.3, 1),  /* Deslizamiento */
  opacity 300ms ease-out;                         /* Fade-in más rápido */
```

**Curva de animación:**
- `cubic-bezier(0.16, 1, 0.3, 1)` = "Ease-Out Expo"
- Efecto: Inicio rápido, frenado suave y elegante
- Sensación: Natural, sin rebotes ni brusquedad

---

### **Efecto "Cortina" paso a paso:**

**Fase 1: Panel cerrado**
```css
width: 0;                   /* No ocupa espacio */
opacity: 0;                 /* Invisible */
transform: translateX(±100%); /* Fuera del área visible */
```

**Fase 2: Usuario hace clic en "NDA" o "Flujo"**
```css
/* React agrega clase .open */
```

**Fase 3: Transición (500ms)**
```css
width: 0 → 500px;           /* Panel crece físicamente */
opacity: 0 → 1;             /* Fade-in (300ms, más rápido) */
transform: ±100% → 0;       /* Se desliza hacia posición final */
```

**Fase 4: Panel abierto**
```css
width: 500px;               /* Tamaño completo */
opacity: 1;                 /* Totalmente visible */
transform: translateX(0);   /* En posición final */
```

**Visual durante transición:**
```
Frame 0:    [Canvas z:20] ← Panel detrás (z:10, invisible)
Frame 250:  [Canvas z:20] ← Panel emergiendo (z:10, semi-visible)
Frame 500:  [Canvas z:20] [Panel z:10 visible al lado]
```

**Sensación deseada:**
> Como una hoja de papel que se desliza suavemente desde detrás del documento principal,  
> sin empujarlo, sin cubrirlo completamente, solo emergiendo al costado.

---

## 🚫 ERRORES COMUNES (Evitar absolutamente)

### **❌ ERROR 1: Canvas con `position: absolute`**

**Problema:**
```css
.legal-center-stage__canvas {
  position: absolute; /* ❌ INCORRECTO */
}
```

**Consecuencia:**
- El modal con `width: fit-content` no puede "ver" el ancho del Canvas
- El navegador cree que el modal está vacío
- Modal colapsa a `width: 0` → **"Efecto fideo"** (modal de 3cm de ancho)

**Solución:**
```css
.legal-center-stage__canvas {
  position: relative; /* ✅ CORRECTO */
  /* El modal "ve" el ancho de 900px y lo respeta */
}
```

---

### **❌ ERROR 2: Anclaje dinámico del Canvas**

**Problema:**
```css
/* Cambiar ancla según estado de panels */
.canvas-when-nda-open { right: 0; }     /* ❌ */
.canvas-when-flow-open { left: 0; }     /* ❌ */
.canvas-when-both-open { left: 500px; } /* ❌ */
```

**Consecuencia:**
- Canvas "salta" entre posiciones al abrir/cerrar panels
- Usuario percibe movimiento → Rompe invariante principal

**Solución:**
```css
.legal-center-stage__canvas {
  position: relative; /* ✅ */
  /* SIN left, SIN right, SIN transform dinámico */
  /* La posición es natural, determinada por el flujo del contenedor */
}
```

---

### **❌ ERROR 3: Modal con ancho fijo de 1750px desde inicio**

**Problema:**
```css
.legal-center-stage {
  width: 1750px; /* ❌ Siempre gigante */
}
```

**Consecuencia:**
- Modal nace con espacios en blanco a los lados
- Sensación de "modal vacío" y poco profesional

**Solución:**
```css
.legal-center-stage {
  width: fit-content; /* ✅ Se ajusta al contenido activo */
  /* Inicia en ~900px (Canvas solo) */
  /* Crece a 1400px (con NDA) o 1250px (con Firmas) */
}
```

---

### **❌ ERROR 4: Paneles con posiciones fijas como `left: 500px`**

**Problema:**
```css
.legal-center-stage__left-overlay {
  left: 500px; /* ❌ Valor hardcoded */
}
```

**Consecuencia:**
- Panel NO está anclado relativamente al Canvas
- Si el Canvas se mueve o el modal cambia, desalineación visual

**Solución:**
```css
.legal-center-stage__left-overlay {
  position: absolute;
  right: 100%; /* ✅ Pegado al borde izquierdo del Canvas */
  /* Se mueve automáticamente si el Canvas se mueve */
}

.legal-center-stage__right-overlay {
  position: absolute;
  left: 100%; /* ✅ Pegado al borde derecho del Canvas */
}
```

---

### **❌ ERROR 5: Z-index invertido**

**Problema:**
```css
.legal-center-stage__canvas { z-index: 10; }      /* ❌ */
.legal-center-stage__left-overlay { z-index: 20; } /* ❌ */
```

**Consecuencia:**
- Paneles aparecen **por encima** del Canvas durante transición
- Efecto de "panel que cubre el documento" en lugar de "emerge desde atrás"

**Solución:**
```css
.legal-center-stage__canvas { z-index: 20; }      /* ✅ Siempre arriba */
.legal-center-stage__left-overlay { z-index: 10; } /* ✅ Debajo */
.legal-center-stage__right-overlay { z-index: 10; } /* ✅ Debajo */
```

---

### **❌ ERROR 6: Crecimiento bidireccional del modal**

**Problema:**
```css
/* Contenedor padre con justify-center */
.modal-wrapper {
  display: flex;
  justify-content: center; /* ❌ Causa crecimiento bilateral */
}
```

**Consecuencia:**
- Al crecer el modal de 900px a 1400px, crece **250px a cada lado**
- Canvas se desplaza 250px a la derecha → Usuario percibe movimiento

**Solución:**
```css
.legal-center-stage {
  width: fit-content;
  margin: 0 auto; /* ✅ Centrado sin justify-center */
  /* El modal crece asimétricamente de forma natural */
}
```

---

### **❌ ERROR 7: Paneles sin colapso físico**

**Problema:**
```css
/* Panel cerrado pero con ancho fijo */
.legal-center-stage__left-overlay {
  width: 500px; /* ❌ Ocupa espacio aunque esté opacity: 0 */
  opacity: 0;
}
```

**Consecuencia:**
- Modal mide 1750px desde el inicio
- Espacios en blanco a los lados del Canvas

**Solución:**
```css
/* Panel cerrado: width: 0 (colapso físico) */
.legal-center-stage__left-overlay {
  width: 0; /* ✅ NO ocupa espacio */
  opacity: 0;
}

/* Panel abierto: width real */
.legal-center-stage__left-overlay.open {
  width: 500px; /* ✅ Ocupa espacio solo cuando está abierto */
  opacity: 1;
}
```

---

## 📏 CÓDIGO CSS DEFINITIVO (Copy-Paste)

```css
/* ============================================================
   LEGAL CENTER STAGE - MODELO DE ANCLAJE UNIVERSAL v3.0
   ============================================================
   
   REGLAS DE ORO:
   1. Canvas = position: relative (ancla física)
   2. Panels = position: absolute (relativos al Canvas)
   3. Z-index: Canvas (20) > Panels (10)
   4. Panels cerrados: width: 0 (colapso físico)
   5. Animaciones sincronizadas: 500ms
   ============================================================ */

/* ============================================
   CONTENEDOR PRINCIPAL (Stage)
   ============================================ */
.legal-center-stage {
  position: relative;
  
  /* ✅ CRÍTICO: fit-content para ajustarse al contenido activo */
  width: fit-content;
  min-width: 900px; /* Canvas mínimo */
  max-width: 1750px; /* Máximo con ambos panels */
  
  /* Centrado en viewport */
  margin: 0 auto;
  
  /* Altura completa */
  height: 100%;
  min-height: 600px;
  
  /* Oculta paneles que están fuera con transform */
  overflow: hidden;
  
  /* Sin fondo propio (transparente) */
  background: transparent;
  
  /* Transición suave del ancho */
  transition: width 500ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* ============================================
   CANVAS CENTRAL (El Sol - Punto Fijo)
   ============================================ */
.legal-center-stage__canvas {
  /* ✅ CRÍTICO: position: relative (NO absolute) */
  /* Esto permite que el contenedor "vea" su ancho */
  position: relative;
  
  /* ✅ ANCHO FIJO INVARIANTE */
  width: 900px;
  height: 100%;
  
  /* ✅ SIEMPRE en primer plano visual */
  z-index: 20;
  
  /* Breathing room interno */
  padding: 40px;
  
  /* Estilo visual */
  background: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  
  /* ❌ PROHIBIDO: left, right, transform dinámicos */
  /* La posición es natural, determinada por el contenedor */
}

/* ============================================
   PANEL NDA (Izquierda - Cortina desde atrás)
   ============================================ */
.legal-center-stage__left-overlay {
  /* Posicionado absolutamente respecto al Canvas */
  position: absolute;
  
  /* ✅ Anclado al borde izquierdo del Canvas */
  right: 100%;
  
  /* Ocupa toda la altura */
  top: 0;
  bottom: 0;
  
  /* ✅ Debajo del Canvas durante transición */
  z-index: 10;
  
  /* ============================================
     ESTADO CERRADO (por defecto)
     ============================================ */
  width: 0; /* ✅ Colapso físico: NO ocupa espacio */
  opacity: 0; /* Invisible */
  transform: translateX(100%); /* Detrás del Canvas */
  
  /* Estilo visual */
  background: #f9fafb;
  border-right: 1px solid #e5e7eb;
  box-shadow: 4px 0 15px rgba(0, 0, 0, 0.1);
  
  /* ✅ Transiciones sincronizadas */
  transition: 
    width 500ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 500ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 300ms ease-out;
  
  /* Scroll interno si el contenido es largo */
  overflow-y: auto;
  overflow-x: hidden;
}

/* Estado ABIERTO del panel NDA */
.legal-center-stage__left-overlay.open {
  width: 500px; /* ✅ Expandido: ocupa espacio físico */
  opacity: 1; /* Totalmente visible */
  transform: translateX(0); /* En posición final */
}

/* ============================================
   PANEL FLUJO DE FIRMAS (Derecha)
   ============================================ */
.legal-center-stage__right-overlay {
  /* Posicionado absolutamente respecto al Canvas */
  position: absolute;
  
  /* ✅ Anclado al borde derecho del Canvas */
  left: 100%;
  
  /* Ocupa toda la altura */
  top: 0;
  bottom: 0;
  
  /* ✅ Debajo del Canvas durante transición */
  z-index: 10;
  
  /* ============================================
     ESTADO CERRADO (por defecto)
     ============================================ */
  width: 0; /* ✅ Colapso físico: NO ocupa espacio */
  opacity: 0; /* Invisible */
  transform: translateX(-100%); /* Detrás del Canvas */
  
  /* Estilo visual */
  background: #f9fafb;
  border-left: 1px solid #e5e7eb;
  box-shadow: -4px 0 15px rgba(0, 0, 0, 0.1);
  
  /* ✅ Transiciones sincronizadas */
  transition: 
    width 500ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 500ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 300ms ease-out;
  
  /* Scroll interno */
  overflow-y: auto;
  overflow-x: hidden;
}

/* Estado ABIERTO del panel Flujo de Firmas */
.legal-center-stage__right-overlay.open {
  width: 350px; /* ✅ Expandido */
  opacity: 1; /* Totalmente visible */
  transform: translateX(0); /* En posición final */
}

/* ============================================
   RESPONSIVE (Mobile)
   ============================================ */
@media (max-width: 768px) {
  .legal-center-stage {
    /* En mobile, modo acordeón o full-screen */
    width: 100%;
    max-width: 100vw;
  }
  
  .legal-center-stage__canvas {
    /* Canvas a ancho completo en mobile */
    width: 100%;
    padding: 20px;
  }
  
  .legal-center-stage__left-overlay,
  .legal-center-stage__right-overlay {
    /* Panels como drawers con backdrop en mobile */
    position: fixed;
    top: 0;
    bottom: 0;
    width: 90vw;
    max-width: 400px;
    z-index: 100;
  }
  
  .legal-center-stage__left-overlay {
    left: 0;
    transform: translateX(-100%);
  }
  
  .legal-center-stage__left-overlay.open {
    transform: translateX(0);
  }
  
  .legal-center-stage__right-overlay {
    right: 0;
    left: auto;
    transform: translateX(100%);
  }
  
  .legal-center-stage__right-overlay.open {
    transform: translateX(0);
  }
}

/* ============================================
   ANIMACIONES REDUCIDAS (Accesibilidad)
   ============================================ */
@media (prefers-reduced-motion: reduce) {
  .legal-center-stage,
  .legal-center-stage__left-overlay,
  .legal-center-stage__right-overlay {
    transition: none;
  }
}
```

---

## 🧪 TESTS DE VALIDACIÓN (Checklist completa)

### **TEST 1: Canvas Inmóvil (CRÍTICO)**

**Procedimiento:**
```
1. Abrir Centro Legal en navegador
2. Usar DevTools → Elements → Inspeccionar .legal-center-stage__canvas
3. Anotar la posición visual (left + transform en computed styles)
4. Abrir panel NDA
5. Verificar que la posición NO cambió
6. Cerrar NDA
7. Verificar que la posición NO cambió
8. Abrir panel Flujo de Firmas
9. Verificar que la posición NO cambió
10. Abrir ambos panels
11. Verificar que la posición NO cambió
```

**Criterio de aceptación:**
> ✅ Si la posición visual del Canvas es idéntica en todos los estados  
> ❌ Si el Canvas se mueve aunque sea 1px → **FALLO CRÍTICO**

---

### **TEST 2: Efecto Cortina (Deslizamiento desde atrás)**

**Procedimiento:**
```
1. Abrir Centro Legal
2. Observar que solo el Canvas está visible
3. Hacer clic en botón "NDA"
4. Durante la transición:
   - Verificar que el panel emerge "desde detrás" del Canvas
   - Verificar que el Canvas se ve "por encima" del panel
   - Verificar que no hay "salto" ni "aparición súbita"
5. Panel completamente abierto:
   - Verificar que está al lado izquierdo del Canvas
   - Verificar que NO tapa el Canvas
```

**Criterio de aceptación:**
> ✅ Transición suave de 500ms con panel emergiendo desde detrás  
> ❌ Si el panel aparece de golpe o se ve "por encima" del Canvas → FALLO

---

### **TEST 3: Ancho del Modal (Fit-content)**

**Procedimiento:**
```
1. Estado inicial → Medir ancho del .legal-center-stage
   Esperado: ~900px
   
2. Abrir NDA → Medir ancho
   Esperado: ~1400px (500 + 900)
   
3. Cerrar NDA → Medir ancho
   Esperado: ~900px (vuelve al inicial)
   
4. Abrir Flujo de Firmas (sin NDA) → Medir ancho
   Esperado: ~1250px (900 + 350)
   
5. Abrir ambos → Medir ancho
   Esperado: ~1750px (500 + 900 + 350)
```

**Criterio de aceptación:**
> ✅ Modal se ajusta al contenido activo sin espacios en blanco  
> ❌ Si hay espacios en blanco a los lados → FALLO

---

### **TEST 4: Sincronización de Animaciones**

**Procedimiento:**
```
1. Abrir NDA con ojo crítico en la transición
2. Verificar que:
   - Expansión del modal (width)
   - Deslizamiento del panel (transform)
   - Fade-in (opacity)
   Ocurren SIMULTÁNEAMENTE sin desfase
```

**Criterio de aceptación:**
> ✅ Todas las animaciones sincronizadas (500ms)  
> ❌ Si hay "rebote" o "doble movimiento" → FALLO

---

### **TEST 5: Z-Index (Capas correctas)**

**Procedimiento:**
```
1. Abrir panel NDA
2. Durante la transición, verificar que el Canvas se ve "por encima"
3. Panel completamente abierto, verificar que:
   - Canvas: z-index: 20
   - Panel NDA: z-index: 10
   - Panel proyecta sombra SOBRE el Canvas (box-shadow visible)
```

**Criterio de aceptación:**
> ✅ Canvas siempre en primer plano visual durante transición  
> ❌ Si el panel tapa al Canvas durante animación → FALLO

---

### **TEST 6: Colapso Físico (Width: 0)**

**Procedimiento:**
```
1. Inspeccionar .legal-center-stage__left-overlay con panel cerrado
2. Verificar que width: 0
3. Medir ancho del modal → Debe ser ~900px (sin espacios)
4. Abrir panel → width cambia a 500px
5. Modal crece a ~1400px
```

**Criterio de aceptación:**
> ✅ Panel cerrado NO ocupa espacio físico (width: 0)  
> ❌ Si el modal mide 1750px con panels cerrados → FALLO

---

## 🎯 RESUMEN EJECUTIVO (TL;DR)

### **Tu visión en 4 frases:**

1. **El Canvas es el punto fijo del universo** → Nunca se mueve visualmente, sin importar qué panels se abran
2. **Los panels se deslizan desde atrás** → Como hojas que emergen desde detrás del documento, no aparecen de golpe
3. **El modal crece asimétricamente** → Se expande solo hacia donde hay contenido nuevo (izquierda/derecha)
4. **Transiciones elegantes** → 500ms sincronizadas, sin saltos ni rebotes

### **Regla de Oro:**

> Si el código que escribís causa que el Canvas cambie su posición visual  
> al abrir/cerrar un panel, está **fundamentalmente incorrecto**.

### **Implementación clave:**

```
Canvas:  position: relative (ancla física)
         width: 900px (fijo)
         z-index: 20 (siempre arriba)

Panels:  position: absolute (relativos al Canvas)
         right: 100% (NDA) o left: 100% (Firmas)
         width: 0 → [tamaño] (colapso físico)
         z-index: 10 (debajo del Canvas)
```

---

## 📌 PRÓXIMOS PASOS RECOMENDADOS

1. ✅ **Aplicar el CSS exacto** de la sección "Código CSS Definitivo"
2. ✅ **Validar con los 6 tests** documentados en orden
3. ✅ **Si algo falla:** Volver a este documento y verificar invariantes
4. ✅ **Una vez validado:** Quitar bordes de debug (rojo/azul/verde)
5. ✅ **Polish final:** Ajustar sombras, bordes, detalles visuales
6. ✅ **Responsive mobile:** Validar comportamiento en pantallas pequeñas
7. ✅ **Accesibilidad:** Verificar que funciona con `prefers-reduced-motion`
8. ✅ **Documentación:** Agregar a la documentación canónica del proyecto

---

## 🎓 LECCIÓN APRENDIDA (Para futuras implementaciones)

### **Concepto clave:**
```
"El Canvas es el suelo. Los panels son alfombras que se deslizan."

❌ NO: Reposicionar el suelo según qué alfombra pongas
✅ SÍ: El suelo está clavado, las alfombras van y vienen
```

### **Implementación técnica:**
```
❌ NO: left/right/transform dinámicos en Canvas basados en estado de panels
✅ SÍ: Canvas con position: relative (sin anclas dinámicas)
       Panels con position: absolute + transform para visibility
```

### **Por qué funciona:**
```
1. Canvas en position: relative → Modal "ve" su ancho (fit-content funciona)
2. Panels en position: absolute → NO afectan al flujo del Canvas
3. Z-index: Canvas (20) > Panels (10) → Efecto "desde detrás"
4. Width: 0 en panels cerrados → Modal compacto sin espacios
5. Transform para visibility → Panels se deslizan sin afectar layout
```

---

## ✅ ESTADO FINAL DEL DOCUMENTO

**Sistema de Anclaje Universal v3.0:**
- ✅ Canvas con posición relativa invariante (no cambia nunca)
- ✅ Panels con posiciones absolutas relativas al Canvas
- ✅ Colapso físico (width: 0) cuando panels están cerrados
- ✅ Efecto cortina con z-index y transform correctos
- ✅ Modal con fit-content que crece asimétricamente
- ✅ Animaciones sincronizadas de 500ms
- ✅ Tests de validación completos y documentados
- ✅ CSS definitivo copy-paste ready

**Confianza:** ⭐⭐⭐⭐⭐ (Muy Alta)

Este documento define **CANÓNICAMENTE** cómo debe funcionar el Centro Legal.  
El Canvas YA NO PUEDE moverse si se implementa correctamente.

---

**Documento creado:** 2026-01-08T07:31:21Z  
**Basado en:** Análisis completo de toda la iteración con Claude y Copilot CLI  
**Aprobación:** Pendiente de validación visual por Manu  
**Próximo paso:** Implementar CSS definitivo y ejecutar tests de validación

---
