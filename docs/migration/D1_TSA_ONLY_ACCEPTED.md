# D1 - Decisión TSA-only ✅ ACEPTADO

**Fecha de aceptación:** 2026-01-22
**Fase:** 2 - Runtime canónico (Paso 1)
**Estado:** CONGELADO - No modificar sin protocolo

---

## 📋 Resumen

La decisión "¿cuándo encolar run_tsa?" ha sido migrada exitosamente del executor al runtime canónico.

### Decisión canónica

**Input:** `events[]` (eventos del documento)

**Output:** `boolean` (¿se debe encolar run_tsa?)

**Regla:**
```typescript
hasEvent('document.protected.requested') && !hasEvent('tsa.confirmed')
```

**Implementación:** `supabase/functions/_shared/decisionEngineCanonical.ts:shouldEnqueueRunTsa()`

---

## ✅ Criterios de aceptación cumplidos

### 1. Función pura implementada
- ✅ `shouldEnqueueRunTsa(events)` creada
- ✅ Determinista y testeable
- ✅ Sin efectos secundarios
- ✅ Tests unitarios pasando

### 2. Shadow mode validado
- ✅ Comparación implementada en `fase1-executor`
- ✅ Logs con marcador `[SHADOW MATCH]`
- ✅ CERO discrepancias detectadas
- ✅ Decisión actual mantiene autoridad

### 3. Validación UI
- ✅ Documento sin protección: comportamiento correcto
- ✅ Documento con protección: TSA se encola correctamente
- ✅ UI pasa de "procesando" a "protegido" correctamente
- ✅ Eventos emitidos en orden esperado

### 4. Comportamiento idéntico
- ✅ Flujo exactamente igual al anterior
- ✅ Sin regresiones
- ✅ Sin cambios en timing
- ✅ Sin cambios en UI

---

## 📊 Evidencia de validación

### Logs de shadow comparison
```
[SHADOW MATCH] run_tsa decision matches canonical: {
  documentEntityId: "7d8ee287-49d3-43e9-9c1b-a64d476a6f03",
  decision: "run_tsa",
  shouldEnqueue: true,
  phase: "PASO_1_SHADOW_MODE"
}
```

### Eventos observados
```
✅ Event appended: document.protected.requested
✅ Event appended: tsa.confirmed
```

### UI verificada
- Estado inicial: "procesando"
- Post-TSA: "protegido"
- Sin bloqueos
- Sin errores

---

## 🔒 Commits relacionados

- `72fa16c` - Limpiar executeCanonicalDecision (fuera de scope)
- `4894c43` - Implementar modo shadow para validación
- `0ea28b0` - Autorizar record-protection-event para emitir evento

---

## 🎯 Próximos pasos

Con D1 aceptado, el siguiente paso es:

**D2 - Estado protegido simple**
- Decisión: "¿El documento está protegido o sigue procesando?"
- Input: `events[]`
- Output: `is_protected: boolean`
- Regla canónica: Por definir

---

## ⚠️ Notas importantes

1. **NO modificar `shouldEnqueueRunTsa()` sin protocolo**
   - Esta decisión está congelada
   - Cualquier cambio requiere nueva validación completa

2. **Shadow mode permanece activo**
   - Los logs de comparación seguirán apareciendo
   - Permiten detectar regresiones futuras

3. **Autoridad sigue en executor**
   - La decisión actual mantiene control
   - La canónica solo valida en paralelo
   - Cambio de autoridad es Fase 3

---

**Validado por:** Usuario (manual UI) + Claude Sonnet 4.5
**Entorno:** Local (Supabase dev)
**Resultado:** ✅ ACEPTADO sin reservas
