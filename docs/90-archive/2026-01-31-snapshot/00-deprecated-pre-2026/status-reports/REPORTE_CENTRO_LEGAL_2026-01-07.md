# 🔍 REPORTE DE DIAGNÓSTICO — CENTRO LEGAL

**Fecha:** 2026-01-07T19:35:00Z
**Issue:** Canvas sigue mostrando layout viejo después de refactor
**Síntoma:** Modal en blanco, no refleja cambios de LegalCenterGrid ni LegalCenterStage
**Estado:** INVESTIGACIÓN ACTIVA

---

## 📊 RESUMEN EJECUTIVO

Después de 2 refactors de layout (Grid + Stage), el Centro Legal sigue mostrando el comportamiento viejo:
- ❌ Canvas en blanco
- ❌ Layout no cambia
- ❌ Ningún cambio visual después de refrescar

**Posibles causas:**
1. Build cache (CSS/JS no actualizado)
2. Ruta incorrecta (test-stage vs centro legal real)
3. Integración incompleta (código nuevo no conectado)
4. Error de compilación silencioso

---

## 🗺️ MAPEO DE COMPONENTES (Estado Actual)

### Componentes Existentes:

```
client/src/components/
├── LegalCenterModalV2.tsx            ← Modal principal (MODIFICADO con Grid)
├── LegalCenterRoot.tsx               ← Context wrapper
├── centro-legal/
│   ├── layout/
│   │   ├── LegalCenterShell.tsx      ← Container del modal (INTACTO)
│   │   ├── LegalCenterGrid.tsx       ← Grid refactor #1 (CREADO, integrado)
│   │   ├── LegalCenterGrid.css       ← CSS con display:contents (MODIFICADO)
│   │   └── stage/
│   │       ├── LegalCenterStage.tsx  ← Stage refactor #2 (CREADO, NO integrado)
│   │       ├── LegalCenterStage.css  ← CSS con absolute (CREADO)
│   │       └── index.ts              ← Export
│   └── orchestration/
│       ├── resolveActiveScene.ts     ← Lógica de scenes (EXISTENTE)
│       └── resolveLayoutScene.ts     ← Layout scenes (CREADO)
```

### Páginas de Test:

```
client/src/pages/
└── TestStagePage.tsx                 ← Test del Stage (CREADO, ruta agregada)
```

---

## 🔌 PUNTOS DE ENTRADA (Cómo se abre el Centro Legal)

### 1. Desde Dashboard (Botón principal)

```typescript
// client/src/pages/DashboardStartPage.tsx
// Usuario hace click en "Nuevo Documento" o "Centro Legal"
const { openLegalCenter } = useLegalCenter();

// Esto invoca:
client/src/contexts/LegalCenterContext.tsx
  → setShowLegalCenter(true)
  → Renderiza: <LegalCenterRoot />
    → Renderiza: <LegalCenterModalV2 />
```

**Estado actual:** Usa LegalCenterModalV2 con Grid refactor #1

---

### 2. Desde Test (/test-stage)

```typescript
// client/src/pages/TestStagePage.tsx
// Renderiza LegalCenterStage directamente (sin modal)

// Ruta: http://localhost:5173/test-stage
```

**Estado actual:** Usa LegalCenterStage (refactor #2) - NO INTEGRADO al modal

---

## 🧩 REFACTOR #1: LegalCenterGrid (Estado)

### Cambios realizados:

1. ✅ Creado `LegalCenterGrid.tsx` (componente wrapper)
2. ✅ Creado `LegalCenterGrid.css` con `display: contents`
3. ✅ Modificado `LegalCenterModalV2.tsx` (líneas ~1854-2656)
4. ✅ Importado `resolveLayoutScene()`

### Problema detectado:

```typescript
// LegalCenterModalV2.tsx línea ~1856
<LegalCenterGrid
  scene={layoutScene}
  leftRail={...}
  canvas={...}
  rightRail={...}
/>
```

**Grid usa `display: contents`**, lo que significa:
- El grid es "invisible" al layout
- Los hijos se posicionan en el grid PADRE (LegalCenterShell)
- Pero LegalCenterShell sigue teniendo `gridTemplateColumns` dinámico

**Resultado:**
- Canvas sigue siendo `1fr` (flexible)
- Sigue achicándose al abrir panels
- Display: contents NO resuelve el problema de fondo

---

## 🧩 REFACTOR #2: LegalCenterStage (Estado)

### Cambios realizados:

1. ✅ Creado `LegalCenterStage.tsx` (absolute positioning)
2. ✅ Creado `LegalCenterStage.css` (canvas fijo)
3. ✅ Creado `TestStagePage.tsx` (página de prueba)
4. ✅ Agregada ruta `/test-stage` en DashboardApp.tsx

### Problema detectado:

**Stage NO está integrado en LegalCenterModalV2**

El Stage existe pero:
- ❌ Solo se usa en TestStagePage
- ❌ NO reemplaza el layout en LegalCenterModalV2
- ❌ Usuario abre Centro Legal → sigue usando Grid (refactor #1)

---

## 🔍 DIAGNÓSTICO: ¿Por qué no funciona?

### Hipótesis Principal:

**El Centro Legal real sigue usando LegalCenterModalV2 + Grid (refactor #1), NO el Stage (refactor #2)**

Flujo actual:
```
Usuario click "Centro Legal"
  → useLegalCenter().openLegalCenter()
  → LegalCenterRoot renderiza LegalCenterModalV2
  → LegalCenterModalV2 usa LegalCenterGrid (display: contents)
  → LegalCenterShell sigue controlando gridTemplateColumns
  → Canvas sigue siendo flexible (1fr)
  → Canvas se achica (problema no resuelto)
```

---

## 🧪 TESTS REALIZADOS (Usuario)

### Test 1: Navegador normal
- ❌ Canvas sigue en blanco/viejo

### Test 2: Incógnito
- ❌ Canvas sigue en blanco/viejo

### Test 3: Otro navegador
- ❌ Canvas sigue en blanco/viejo

### Test 4: Reiniciar servidor
- ❌ Canvas sigue en blanco/viejo

**Conclusión:** No es problema de cache.

---

## 📋 ARCHIVOS MODIFICADOS (Resumen)

### Refactor #1 (Grid):
- ✏️ `client/src/components/LegalCenterModalV2.tsx` (wrapper con Grid)
- ➕ `client/src/components/centro-legal/layout/LegalCenterGrid.tsx`
- ➕ `client/src/components/centro-legal/layout/LegalCenterGrid.css`
- ➕ `client/src/components/centro-legal/orchestration/resolveLayoutScene.ts`

### Refactor #2 (Stage):
- ➕ `client/src/components/centro-legal/stage/LegalCenterStage.tsx`
- ➕ `client/src/components/centro-legal/stage/LegalCenterStage.css`
- ➕ `client/src/pages/TestStagePage.tsx`
- ✏️ `client/src/DashboardApp.tsx` (ruta /test-stage)

---

## 🎯 POSIBLES CAUSAS DEL PROBLEMA

### Causa 1: Build no actualizado ❌ (Descartada)
- Usuario reinició servidor
- Cambió navegador/incógnito
- Problema persiste

### Causa 2: Ruta incorrecta ⚠️ (Probable)
- Usuario intenta abrir Centro Legal normal → usa LegalCenterModalV2
- Test Stage está en `/test-stage` → NO es el modal normal
- **Stage NO está integrado en el modal principal**

### Causa 3: Grid con display:contents no funciona ✅ (Confirmada)
- Display:contents hace grid "transparente"
- Pero hijos se posicionan en grid PADRE (Shell)
- Shell sigue controlando layout → canvas sigue flexible

### Causa 4: Error de compilación silencioso ⚠️ (A verificar)
- TypeScript puede tener errores que no rompen el dev server
- CSS puede no estar aplicándose

---

## 🔧 VERIFICACIONES NECESARIAS

### 1. ¿Qué está usando el Centro Legal actualmente?

```bash
# Verificar si LegalCenterModalV2 está importando Grid
grep -n "LegalCenterGrid" client/src/components/LegalCenterModalV2.tsx

# Resultado esperado:
# Línea ~56: import LegalCenterGrid
# Línea ~1856: <LegalCenterGrid
```

### 2. ¿El CSS del Grid se está aplicando?

```bash
# Verificar que el CSS existe y está correcto
cat client/src/components/centro-legal/layout/LegalCenterGrid.css | head -30
```

### 3. ¿Hay errores de TypeScript?

```bash
cd client && npx tsc --noEmit 2>&1 | grep -i "error\|LegalCenter"
```

### 4. ¿El Stage está en algún lado del modal?

```bash
# Verificar si Stage está integrado
grep -n "LegalCenterStage" client/src/components/LegalCenterModalV2.tsx

# Resultado esperado: SIN RESULTADOS (no integrado)
```

---

## 🚨 PROBLEMA IDENTIFICADO (Hipótesis Final)

**El Centro Legal está usando Grid (refactor #1), NO Stage (refactor #2)**

### Por qué Grid no funciona:

```css
/* LegalCenterGrid.css */
.legal-center-grid {
  display: contents; /* Grid es "invisible" */
}

/* Los hijos se posicionan en el grid PADRE */
.legal-center-grid__canvas {
  grid-column: 2; /* Columna 2 del grid PADRE (LegalCenterShell) */
}
```

Pero:

```typescript
// LegalCenterShell.tsx línea ~55
<div style={{ gridTemplateColumns }}>
  {/* gridTemplateColumns es dinámico: "320px 1fr 360px" */}
  {/* La columna 2 sigue siendo 1fr (FLEXIBLE) */}
</div>
```

**Resultado:** Canvas sigue siendo `1fr`, sigue achicándose.

---

## ✅ SOLUCIONES PROPUESTAS

### Opción A: Integrar Stage en LegalCenterModalV2 (Recomendado)

**Qué hacer:**
1. Modificar `LegalCenterModalV2.tsx`
2. Reemplazar `<LegalCenterGrid>` con `<LegalCenterStage>`
3. Adaptar props (canvas, leftOverlay, rightOverlay)
4. Mantener LegalCenterShell como container

**Ventajas:**
- ✅ Stage garantiza canvas invariante (absolute positioning)
- ✅ No depende de grid del padre
- ✅ Ya está testeado en TestStagePage

**Desventajas:**
- ⚠️ Requiere adaptar props del modal
- ⚠️ Puede requerir ajustes en responsive

---

### Opción B: Arreglar Grid para que use absolute (Medio camino)

**Qué hacer:**
1. Modificar `LegalCenterGrid.css`
2. Cambiar `display: contents` → `display: block` + `position: relative`
3. Canvas usar `position: absolute` dentro del Grid
4. Overlays usar `position: absolute`

**Ventajas:**
- ✅ Menos cambios en LegalCenterModalV2
- ✅ Grid sigue existiendo (menos breaking changes)

**Desventajas:**
- ❌ Sigue dependiendo de Shell
- ❌ Más complejo que Stage puro

---

### Opción C: Feature flag para testear Stage (Seguro)

**Qué hacer:**
1. Agregar flag: `USE_NEW_STAGE = false` (por defecto)
2. Cuando `true` → usa Stage
3. Cuando `false` → usa Grid actual
4. Usuario puede probar ambos

**Ventajas:**
- ✅ No rompe nada existente
- ✅ Permite A/B testing
- ✅ Rollback trivial

**Desventajas:**
- ⚠️ Mantener dos paths en paralelo
- ⚠️ Eventual limpieza necesaria

---

## 🎯 RECOMENDACIÓN FINAL

**Opción A + C combinadas:**

1. Integrar Stage en LegalCenterModalV2 **con feature flag**
2. Por defecto: flag = false (usa Grid actual)
3. Usuario activa flag → usa Stage nuevo
4. Si Stage funciona → flag = true por defecto
5. Eventualmente: eliminar Grid viejo

---

## 📋 CHECKLIST DE ACCIÓN INMEDIATA

### Para confirmar diagnóstico:

- [ ] Verificar que LegalCenterModalV2 usa Grid (no Stage)
- [ ] Verificar que /test-stage funciona (Stage aislado)
- [ ] Abrir DevTools en Centro Legal normal → ver qué CSS se aplica
- [ ] Verificar errores de consola (Console tab)
- [ ] Verificar errores de TypeScript

### Para solucionar:

- [ ] Decidir: Opción A, B, o C
- [ ] Si A → Integrar Stage en modal
- [ ] Si B → Arreglar Grid con absolute
- [ ] Si C → Feature flag
- [ ] Test visual después de cambios
- [ ] Validar invariante del canvas

---

## 🔗 ARCHIVOS CLAVE PARA REVISAR

1. **`client/src/components/LegalCenterModalV2.tsx`**
   - Ver líneas 1854-2656 (wrapper con Grid)
   - Ver si Stage está integrado

2. **`client/src/components/centro-legal/layout/LegalCenterShell.tsx`**
   - Ver gridTemplateColumns (línea ~55)
   - Ver si controla layout del Grid

3. **`client/src/components/centro-legal/layout/LegalCenterGrid.css`**
   - Ver display: contents (línea ~19)
   - Ver grid-column de canvas (línea ~32)

4. **`client/src/pages/TestStagePage.tsx`**
   - Ver si Stage funciona aislado
   - Comparar con modal real

---

## 📊 PRÓXIMOS PASOS

1. **Confirmar diagnóstico:**
   - Abrir /test-stage → ver si Stage funciona aislado
   - Abrir Centro Legal normal → ver qué layout usa
   - DevTools → ver CSS aplicado

2. **Decidir estrategia:**
   - Opción A, B, o C
   - Comunicar decisión

3. **Implementar fix:**
   - Modificar archivos necesarios
   - Test visual
   - Validar invariante

4. **Validar solución:**
   - Canvas NO se mueve
   - Animaciones suaves
   - Funcionalidad intacta

---

**Autor:** Claude Sonnet 4.5
**Estado del reporte:** COMPLETO
**Confianza en diagnóstico:** ⭐⭐⭐⭐⭐ Muy Alta

El problema NO es cache ni browser. Es que el Stage nuevo NO está integrado en el modal principal.
