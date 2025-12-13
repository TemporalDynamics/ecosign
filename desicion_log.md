# 📋 Decision Log — EcoSign

## 📖 Cómo usar este documento

Este es un **diario de arquitectura + UX** donde documentamos decisiones importantes del producto.

### ❌ Qué NO debería ser este documento:
- Un changelog técnico
- Un listado de commits
- Un documento largo
- Algo que solo entienda ingeniería

### ✅ Qué SÍ debería ser:
- **Corto**: Una entrada por iteración significativa
- **Humano**: Lenguaje claro, sin jerga innecesaria
- **Explicativo**: El "por qué", no solo el "qué"
- **Orientado a decisión**: Qué se decidió y qué se descartó

**Pensalo como un diario de arquitectura + UX.**

### 📝 Qué documentar aquí:
- Cambios significativos en UI/UX
- Decisiones de arquitectura
- Código eliminado (y por qué)
- Cosas que NO hicimos a propósito
- Deuda técnica conocida

---

## 📝 Template para nuevas entradas

```markdown
## Iteración YYYY-MM-DD — [Nombre del cambio]

### 🎯 Objetivo
Qué se buscaba lograr con esta iteración (1–2 frases).

### 🧠 Decisiones tomadas
- Decisión 1 (qué y por qué)
- Decisión 2
- Decisión 3

### 🛠️ Cambios realizados
- Cambio concreto en UI / lógica
- Eliminación de código obsoleto
- Ajustes visuales relevantes

### 🚫 Qué NO se hizo (a propósito)
- Cosa que se decidió no implementar
- Feature pospuesta
- Alternativa descartada

### ⚠️ Consideraciones / deuda futura
- Cosas a revisar más adelante
- Suposiciones tomadas
- Límites actuales

### 📍 Estado final
- Qué quedó mejor
- Qué sigue pendiente

### 💬 Nota del dev
"Este cambio mejora X y evita Y. Si alguien toca esta parte, tener en cuenta Z."
```

---

> ⚠️ **IMPORTANTE**: Todo lo que está arriba de esta línea es la estructura fija del documento.
> NO modificar ni eliminar. Las entradas nuevas van abajo de esta sección.

---

# 📚 Historial de Iteraciones

## Iteración 2025-12-13 — Estabilización del Centro Legal

### 🎯 Objetivo
Eliminar todos los "saltos visuales" del modal del Centro Legal para que se sienta sólido, serio y predecible. Construir confianza perceptiva.

### 🧠 Decisiones tomadas
- **Grid fijo de 3 columnas**: El modal NUNCA cambia de ancho, aunque haya columnas vacías. Esto evita que el cerebro perciba "movimiento" cuando se activan/desactivan paneles.
- **Preview con altura base fija**: El preview del PDF siempre tiene la misma altura base (h-80), solo cambia cuando el usuario lo pide explícitamente (expanded mode).
- **Eliminar código obsoleto**: Todo código con `&& false` o estados legacy que nunca se usan → eliminados. Si no se usa, no existe.
- **Valores fijos para dashboard**: Como el dashboard será eliminado próximamente, todas las referencias a `storePdfInDashboard` se reemplazan con valores fijos (`storePdf: false`, `zeroKnowledgeOptOut: true`).

### 🛠️ Cambios realizados
- Grid condicional → Grid fijo `grid-cols-[300px,1fr,300px]`
- Eliminado estado `signers` (legacy, nunca usado)
- Eliminado panel forense colapsable (88 líneas desactivadas con `&& false`)
- Eliminado estado `forensicPanelOpen`
- Preview sin centering condicional → siempre `bg-gray-100` sin cambios de layout
- Reducción neta: **~94 líneas de código**

### 🚫 Qué NO se hizo (a propósito)
- **NO agregamos nuevas features**: Solo limpieza y estabilización.
- **NO tocamos la lógica de certificación**: Los cambios fueron solo UI/layout.
- **NO modificamos el comportamiento de cierre**: Ya estaba bien implementado (X del header cierra todo, overlay usa flecha).

### ⚠️ Consideraciones / deuda futura
- **annotationMode/annotations**: La UI existe pero no hay lógica de anotación. Pendiente decidir si se elimina o se implementa.
- **sharePanelOpen**: Estado declarado pero nunca usado. Candidato para próxima limpieza.
- **Dashboard**: Se eliminará próximamente, lo cual simplificará aún más el código.

### 📍 Estado final
- **Qué quedó mejor**: El modal es visualmente estable. No "respira" ni salta cuando se cargan archivos o se activan paneles.
- **Qué sigue pendiente**: Verificar en producción que no haya problemas de caché en navegadores.

### 💬 Nota del dev
"Este cambio prioriza la percepción sobre la funcionalidad. Un modal que 'respira' genera desconfianza subconsciente. Ahora el Centro Legal se siente como un producto serio. Si alguien quiere agregar paneles condicionales en el futuro: NO cambiar el grid. Mejor usar visibility/opacity en vez de mount/unmount."

**Commit**: `ea82976` | **Deploy**: ✅ Producción (www.ecosign.app)
