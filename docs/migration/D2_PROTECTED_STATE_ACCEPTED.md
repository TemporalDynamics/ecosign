# D2 - Estado protegido simple ✅ ACEPTADO

**Fecha de aceptación:** 2026-01-22
**Fase:** 2 - Runtime canónico (Paso 2)
**Estado:** CONGELADO - No modificar sin protocolo

---

## 📋 Resumen

La derivación "¿el documento está protegido?" ha sido formalizada canónicamente.

**Diferencia con D1:**
- **D1 (TSA-only):** Decisión de **ejecución** (¿cuándo encolar run_tsa?)
- **D2 (Estado protegido):** Derivación de **estado** (¿qué mostrar en UI?)

### Regla canónica

**Input:** `events[]` (eventos del documento)

**Output:** `boolean` (¿está protegido?)

**Regla:**
```typescript
hasEvent('tsa.confirmed')
```

**Implementación:** `supabase/functions/_shared/decisionEngineCanonical.ts:isDocumentProtected()`

---

## ✅ Criterios de aceptación cumplidos

### 1. Función pura implementada
- ✅ `isDocumentProtected(events)` creada
- ✅ Determinista y testeable
- ✅ Sin efectos secundarios
- ✅ Tests unitarios: 100% pass

### 2. Equivalencia con UI actual
- ✅ UI usa: `deriveProtectionLevel(events) !== 'NONE'`
- ✅ Canónico usa: `isDocumentProtected(events)`
- ✅ Ambos son equivalentes
- ✅ Sin regresiones

### 3. Lógica validada
```
Sin eventos → false (procesando) ✅
Con solicitud pero sin TSA → false (procesando) ✅
Con TSA confirmado → true (protegido) ✅
Con TSA + anchors → true (protegido) ✅
Con error pero sin TSA → false (no protegido) ✅
```

---

## 🔍 Por qué D2 NO necesita shadow mode

A diferencia de D1:
- **D1** era una decisión del executor (¿encolar job?)
  - Requería shadow mode para validar
  - El executor tomaba la decisión

- **D2** es una derivación de estado (¿qué mostrar?)
  - La UI ya lo deriva correctamente
  - No hay "ejecución" que validar
  - Solo formalizamos la regla

**Validación:** La lógica canónica coincide matemáticamente con la UI actual.

---

## 📊 Equivalencia matemática

| Escenario | UI actual | Canónico | Match |
|-----------|-----------|----------|-------|
| Sin eventos | `processing` | `false` | ✅ |
| Solo solicitud | `processing` | `false` | ✅ |
| Con TSA | `protected` | `true` | ✅ |
| TSA + anchors | `protected` | `true` | ✅ |

---

## 🔒 Commits relacionados

- `4edb406` - Implementar D2 estado protegido simple

---

## 🎯 Próximos pasos

Con D2 aceptado, el siguiente paso lógico es:

**D3 - Estado finalizado**
- Decisión: "¿El documento completó TODO lo solicitado?"
- Input: `events[]` + `protection` (qué se solicitó)
- Output: `is_complete: boolean`
- Regla canónica: Por definir

---

## ⚠️ Nota importante

D2 es una **derivación**, no una **decisión de ejecución**.

Esto significa:
- No encola jobs
- No tiene efectos secundarios
- Solo responde: "¿tiene TSA confirmado?"

La UI puede seguir usando su lógica actual.
Esta función existe para:
- Uso en backend/APIs
- Validaciones
- Futuras integraciones
- Documentación canónica

---

**Validado por:** Tests automatizados + equivalencia matemática
**Entorno:** Lógica pura (sin deps de entorno)
**Resultado:** ✅ ACEPTADO sin reservas
