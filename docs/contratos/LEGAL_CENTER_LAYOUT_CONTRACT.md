# 🎨 CONTRATO DE LAYOUT — CENTRO LEGAL

**Versión:** v1.0  
**Estado:** CANÓNICO  
**Fecha:** 2026-01-07  
**Scope:** UI / UX / Arquitectura de Layout  
**Normas:** MUST, SHOULD, MAY

---

## 0️⃣ PROPÓSITO

Definir el comportamiento canónico del layout del Centro Legal para:

1. ✅ Eliminar saltos visuales
2. ✅ Mantener foco cognitivo
3. ✅ Permitir complejización progresiva sin compresión
4. ✅ Garantizar coherencia legal y probatoria

**Este contrato NO define lógica de negocio, solo disposición, invariantes y estados visuales.**

---

## 1️⃣ PRINCIPIO RECTOR (INVARIANTE FUNDAMENTAL)

### El Canvas Central NUNCA cambia de tamaño

**MUST:**
- El ancho y alto del canvas central son **constantes** desde el primer render
- El canvas **NO** se re-dimensiona al abrir o cerrar:
  - NDA
  - Flujo de firmas
  - Firma visual
  - Protección legal

**MUST NOT:**
- ❌ Compresión del canvas por aparición de paneles laterales
- ❌ Reflow que modifique el foco visual principal
- ❌ Cambios de tamaño dinámicos basados en contenido lateral

---

## 2️⃣ ESTRUCTURA DE GRID CANÓNICA

El Centro Legal se renderiza **siempre** con una estructura lógica de 3 columnas, aunque algunas estén ocultas.

```
┌─────────────────┬───────────────────────────┬─────────────────┐
│  Left Rail      │    CANVAS CENTRAL         │   Right Rail    │
│  (NDA)          │    (FIJO)                 │   (Flujo)       │
│                 │                           │                 │
│  320px          │    1fr                    │   360px         │
│  (overlay)      │    (invariante)           │   (overlay)     │
└─────────────────┴───────────────────────────┴─────────────────┘
```

### 2.1 Canvas Central (Ancla Cognitiva)

**MUST:**
- Siempre presente
- Tamaño fijo (`grid-column: canvas`)
- NO usa `width`, `max-width`, `flex-basis` dinámicos

**Contiene:**
- Drop Zone (estado inicial)
- Preview del documento
- Toolbar de preview
- Toggles de acciones (NDA, Protección, Firma, Flujo)
- CTA final

### 2.2 Left Rail — NDA

**MUST:**
- Columna contextual
- Aparece/desaparece **sin afectar el canvas**
- Overlay lateral (usa `transform: translateX()`)
- Ancho fijo: `320px`

**Animación:**
```css
transform: translateX(0);          /* visible */
transform: translateX(-100%);     /* oculto */
transition: transform 400ms cubic-bezier(0.4, 0, 0.2, 1);
```

### 2.3 Right Rail — Flujo de Firmas

**MUST:**
- Columna contextual
- Aparece/desaparece **sin afectar el canvas**
- Overlay lateral (usa `transform: translateX()`)
- Ancho fijo: `360px`

**Animación:**
```css
transform: translateX(0);          /* visible */
transform: translateX(100%);      /* oculto */
transition: transform 400ms cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 3️⃣ ESTADOS CANÓNICOS DEL LAYOUT (Scenes)

El layout responde a **estados explícitos**, no a condiciones implícitas.

### 3.1 `scene = 'document_only'` (Step 1)

**Descripción:** Estado inicial del Centro Legal.

**Layout:**
- ✅ Solo Canvas Central visible
- ❌ Left Rail oculto
- ❌ Right Rail oculto

**Comportamiento:**
- Drop Zone visible
- NO hay CTA activo
- NO hay toggles interactivos

**MUST:**
- El tamaño del canvas ya es el tamaño final
- NO ocupa "toda la pantalla por defecto"

---

### 3.2 `scene = 'document_loaded'` (Step 1.5)

**Descripción:** Documento cargado, sin acciones activadas.

**Layout:**
- ✅ Canvas Central
- ❌ Rails ocultos

**UI:**
- Aparecen toggles:
  - NDA
  - Protección
  - Mi Firma
  - Flujo de Firmas
- Toggles en estado **inactivo** (outline / secondary)

**CTA:**
- Deshabilitado (outline / gray)

---

### 3.3 `scene = 'nda_open'` (Step 2A)

**Descripción:** Configuración de NDA.

**Layout:**
- ✅ Canvas Central (sin cambios)
- ✅ Left Rail visible
- ❌ Right Rail oculto

**MUST:**
- Apertura/cierre del NDA **NO altera el canvas**
- NDA se percibe como "capa contextual"

**Animación:**
```typescript
leftRail.style.transform = 'translateX(0)';
// Canvas NO se mueve
```

---

### 3.4 `scene = 'flow_open'` (Step 2B)

**Descripción:** Configuración de flujo de firmas.

**Layout:**
- ✅ Canvas Central (sin cambios)
- ❌ Left Rail oculto
- ✅ Right Rail visible

**MUST:**
- Apertura/cierre del Flujo **NO altera el canvas**

---

### 3.5 `scene = 'nda_and_flow_open'` (Step 3)

**Descripción:** Configuración completa.

**Layout:**
- ✅ Canvas Central
- ✅ Left Rail visible
- ✅ Right Rail visible

**Referencia visual:**
- Este estado corresponde al layout "perfecto" (imagen 10)
- ✅ No hay compresión
- ✅ No hay saltos
- ✅ No hay reflow cognitivo

---

## 4️⃣ MODALES INTERNOS (No afectan layout base)

### 4.1 Modal de Firma (Mi Firma)

**MUST:**
- Renderizarse como modal centrado
- Bloquear interacción con rails
- **NO modificar layout base**

**Ciclo:**
```
Open → Apply → Close
```

Al cerrar, el layout vuelve al estado previo **intacto**.

### 4.2 Modal de Protección Legal

**MUST:**
- Modal liviano
- Acción explícita activar/desactivar
- **NO modificar layout base**

---

## 5️⃣ CTA FINAL (Regla de jerarquía)

**MUST:**
- Existe **un solo CTA primario**
- Estilo: sólido (negro / principal)
- Solo se activa cuando el flujo es **válido**

**SHOULD:**
- Toggles secundarios en estilo **outline** / azul profundo
- Refuerzan acción sin competir

**Ejemplo:**
```tsx
{/* Toggles secundarios */}
<button className="border-2 border-blue-600 text-blue-600">
  NDA
</button>

{/* CTA primario */}
<button className="bg-black text-white disabled:bg-gray-300">
  Certificar Documento
</button>
```

---

## 6️⃣ HEADER MÓVIL (Comportamiento UX)

### Objetivo:
El header **se desplaza suavemente**, no teletransporta.

### Comportamiento:

```tsx
const headerOffset = {
  'document_only': '0px',
  'document_loaded': '0px',
  'nda_open': '160px',           // Se mueve a la derecha
  'flow_open': '-180px',          // Se mueve a la izquierda
  'nda_and_flow_open': '0px'      // Centrado
}[scene];

<div style={{
  transform: `translateX(${headerOffset})`,
  transition: 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)'
}}>
  <h2>Centro Legal</h2>
  <button>⋯</button>
</div>
```

### MUST:
- Animación **lenta** (400ms mínimo)
- Easing **suave** (cubic-bezier)
- Sin "snap"

### Menú de Opciones:

**Contenido del menú (⋯):**
1. 📁 Crear nueva operación
2. 💾 Guardar
3. 📋 Guardar como...
4. ─────────────────
5. ✕ Cerrar Centro Legal

**MUST:**
- El ❌ cerrar está **dentro** del menú
- No hay botón cerrar visible por defecto

---

## 7️⃣ EVENTOS DE LAYOUT (Informativo)

Cada transición de scene **SHOULD** emitir evento (no obligatorio en esta fase):

```typescript
{
  kind: 'scene_entered',
  scene: 'nda_open',
  at: '2026-01-07T...',
}
```

**Eventos sugeridos:**
- `scene_entered`
- `nda_opened`
- `nda_closed`
- `flow_opened`
- `flow_closed`

**Nota:** Esto NO afecta el layout, solo deja trazabilidad.

---

## 8️⃣ RELACIÓN CON OPERACIONES (Fuera de Scope)

Este contrato **NO define:**
- ❌ Dónde se guarda el documento
- ❌ Operaciones
- ❌ Carpetas
- ❌ Historial

**El Centro Legal:**
- ✅ Orquesta legalidad
- ❌ NO decide persistencia

---

## 9️⃣ RESPONSIVE (Mobile)

### Breakpoint: `768px`

**Desktop (>768px):**
```css
grid-template-columns: 320px 1fr 360px;
```

**Mobile (<768px):**
```css
grid-template-columns: 1fr;

.left-rail, .right-rail {
  position: absolute;
  width: 90vw;
  max-width: 400px;
  z-index: 100;
  box-shadow: 0 0 20px rgba(0,0,0,0.2);
}
```

**MUST:**
- Rails se convierten en overlays absolutos
- Canvas sigue siendo fijo (ahora 100vw)
- Backdrop oscuro al abrir rails

---

## 🔟 REGLA DE ORO FINAL

> **"El Centro Legal despliega complejidad, no la comprime.**  
> **El usuario nunca pierde espacio: gana contexto."**

---

## ✅ COMPLIANCE CHECKLIST

### Para validar implementación:

- [ ] Canvas central tiene ancho fijo en CSS
- [ ] Rails usan `transform: translateX()` (no `width`)
- [ ] Transiciones de 400ms o más
- [ ] Easing suave (cubic-bezier)
- [ ] Sin reflow horizontal
- [ ] Header se mueve orgánicamente
- [ ] Modales NO afectan grid
- [ ] Mobile responsive con overlays
- [ ] Un solo CTA primario visible
- [ ] Menú de opciones en header

---

**Documento:** Contrato de Layout — Centro Legal  
**Estado:** CANÓNICO ✅  
**Fecha:** 2026-01-07  
**Próxima revisión:** Post-implementación (validación UX)
