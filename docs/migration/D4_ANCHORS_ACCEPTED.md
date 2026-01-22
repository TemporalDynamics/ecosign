# D4 - Anchors pendientes (Polygon / Bitcoin) ✅ ACEPTADO

**Fecha de aceptación:** 2026-01-22
**Fase:** 2 - Runtime canónico (Paso 4)
**Estado:** CONGELADO - No modificar sin protocolo

---

## 📋 Resumen

Las decisiones "¿cuándo encolar anchors?" han sido migradas exitosamente del executor al runtime canónico.

### Decisiones canónicas

**D4.1 - Polygon:**
```typescript
shouldEnqueuePolygon(events, protection) → boolean

Regla:
hasTsa && protection.includes('polygon') && !hasAnchorConfirmed('polygon')
```

**D4.2 - Bitcoin:**
```typescript
shouldEnqueueBitcoin(events, protection) → boolean

Regla:
hasTsa && protection.includes('bitcoin') && !hasAnchorConfirmed('bitcoin')
```

**Implementación:** `supabase/functions/_shared/decisionEngineCanonical.ts`

---

## ✅ Criterios de aceptación cumplidos

### 1. Funciones puras implementadas
- ✅ `shouldEnqueuePolygon(events, protection)` creada
- ✅ `shouldEnqueueBitcoin(events, protection)` creada
- ✅ `hasAnchorConfirmed(events, network)` helper con validación temporal
- ✅ Deterministas y testeables
- ✅ Tests unitarios: 100% pass (6 escenarios)

### 2. Shadow mode validado
- ✅ Comparación implementada en `fase1-executor`
- ✅ Logs con marcador `[SHADOW MATCH]` para polygon
- ✅ Logs con marcador `[SHADOW MATCH]` para bitcoin
- ✅ CERO discrepancias detectadas
- ✅ Decisión actual mantiene autoridad

### 3. Validación UI
- ✅ Documento con TSA + polygon + bitcoin solicitados
- ✅ Primera ejecución: encola ambos anchors ✅
- ✅ Segunda ejecución: no encola (ya submitted) ✅
- ✅ Eventos emitidos correctamente

### 4. Comportamiento idéntico
- ✅ Flujo exactamente igual al anterior
- ✅ Sin regresiones
- ✅ Sin cambios en timing
- ✅ Idempotencia respetada

---

## 📊 Evidencia de validación

### Logs de shadow comparison (primera ejecución)
```
[SHADOW MATCH] polygon anchor decision matches canonical: {
  shouldEnqueue: true,
  phase: "PASO_1_SHADOW_MODE_D4"
}

[SHADOW MATCH] bitcoin anchor decision matches canonical: {
  shouldEnqueue: true,
  phase: "PASO_1_SHADOW_MODE_D4"
}
```

### Eventos observados
```
✅ Event appended: tsa.confirmed
✅ Event appended: anchor.submitted (polygon)
✅ Event appended: anchor.submitted (bitcoin)
```

---

## 🔍 Detalle técnico importante

### Validación de causalidad temporal

La función `hasAnchorConfirmed()` valida:
```typescript
confirmed_at >= event.at  // Causalidad temporal
```

Esto previene anchors con timestamps retroactivos (inválidos).

**Test específico:**
```typescript
Test 6 - Causalidad temporal inválida:
  anchor.at: '2026-01-22T12:00:00Z'
  anchor.confirmed_at: '2026-01-22T11:00:00Z'  // ANTES del evento
  Resultado: shouldEnqueuePolygon = true  // Anchor rechazado
  Match: ✅
```

---

## 🔒 Commits relacionados

- `7be983a` - Implementar D4 anchors con shadow mode

---

## 🎯 Próximos pasos

Con D1, D2 y D4 aceptados, el siguiente paso es:

**D3 - Documento finalizado (Artifact)**
- Decisión: "¿El documento completó TODO lo solicitado?"
- Input: `events[]` + `protection`
- Output: `shouldEnqueueArtifact: boolean`
- Regla canónica: TSA + todos los anchors requeridos confirmados

---

## ⚠️ Notas importantes

1. **NO modificar decisiones de anchors sin protocolo**
   - `shouldEnqueuePolygon()` y `shouldEnqueueBitcoin()` congeladas
   - Cualquier cambio requiere nueva validación completa

2. **Shadow mode permanece activo**
   - Los logs de comparación seguirán apareciendo
   - Permiten detectar regresiones futuras

3. **Autoridad sigue en executor**
   - La decisión actual mantiene control
   - Las canónicas solo validan en paralelo
   - Cambio de autoridad es Fase 3

4. **Diferencia con D1:**
   - D1: una decisión (TSA)
   - D4: DOS decisiones (polygon + bitcoin)
   - Ambas siguen el mismo patrón: hasTsa + requiresX + !hasX

---

**Validado por:** Usuario (manual UI + logs) + Tests automatizados
**Entorno:** Local (Supabase dev)
**Resultado:** ✅ ACEPTADO sin reservas
