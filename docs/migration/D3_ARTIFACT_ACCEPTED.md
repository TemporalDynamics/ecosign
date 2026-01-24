# D3 - Documento finalizado (Artifact) ✅ ACEPTADO

**Fecha de aceptación:** 2026-01-22
**Fase:** 2 - Runtime canónico (Paso 5)
**Estado:** CONGELADO - No modificar sin protocolo

---

## 📋 Resumen

La decisión "¿cuándo encolar build_artifact?" ha sido migrada exitosamente del executor al runtime canónico.

### Decisión canónica

**D3 - Artifact:**
```typescript
shouldEnqueueArtifact(events, protection) → boolean

Regla:
hasTsa &&
todosLosAnchorsRequeridosConfirmados &&
!hasArtifact
```

**Implementación:** `supabase/functions/_shared/decisionEngineCanonical.ts`

---

## ✅ Criterios de aceptación cumplidos

### 1. Función pura implementada
- ✅ `shouldEnqueueArtifact(events, protection)` creada
- ✅ Regla canónica: TSA + todos los anchors solicitados confirmados + sin artifact
- ✅ Determinista y testeable
- ✅ Tests unitarios: 100% pass (7 escenarios)

### 2. Shadow mode validado
- ✅ Comparación implementada en `fase1-executor`
- ✅ Logs con marcador `[SHADOW MATCH]` para artifact
- ✅ CERO discrepancias detectadas
- ✅ Decisión actual mantiene autoridad

### 3. Validación de casos edge
- ✅ TSA-only (sin anchors solicitados) → listo para artifact
- ✅ Con anchors solicitados pero no confirmados → NO listo
- ✅ Con algunos anchors confirmados pero no todos → NO listo
- ✅ Con todos los anchors solicitados confirmados → listo
- ✅ Con artifact ya finalizado → NO regenerar

### 4. Comportamiento idéntico
- ✅ Flujo exactamente igual al anterior
- ✅ Sin regresiones
- ✅ Sin cambios en timing
- ✅ Idempotencia respetada

---

## 📊 Evidencia de validación

### Tests unitarios

```
Test 1 - Sin TSA:
  shouldEnqueueArtifact: false ✅

Test 2 - Con TSA pero sin anchors:
  shouldEnqueueArtifact: false ✅ (faltan anchors)

Test 3 - Con TSA y polygon, falta bitcoin:
  shouldEnqueueArtifact: false ✅ (falta bitcoin)

Test 4 - Con TSA y TODOS los anchors solicitados:
  shouldEnqueueArtifact: true ✅ (listo para artifact)

Test 5 - Con TSA y solo polygon (no se pidió bitcoin):
  shouldEnqueueArtifact: true ✅ (listo)

Test 6 - TSA-only (sin anchors solicitados):
  shouldEnqueueArtifact: true ✅ (solo TSA)

Test 7 - Con artifact ya finalizado:
  shouldEnqueueArtifact: false ✅ (ya existe)

✅ Todos los tests pasaron
```

### Logs de shadow comparison

```
[SHADOW MATCH] artifact decision matches canonical: {
  documentEntityId: "...",
  jobId: "...",
  shouldEnqueue: true,
  phase: "PASO_1_SHADOW_MODE_D3"
}
```

---

## 🔍 Detalle técnico importante

### Lógica de "todos los anchors solicitados"

La decisión D3 valida que **TODOS** los anchors solicitados estén confirmados:

```typescript
// Si se pidió polygon → debe estar confirmado
if (requiresPolygon && !hasPolygon) return false;

// Si se pidió bitcoin → debe estar confirmado
if (requiresBitcoin && !hasBitcoin) return false;

// Si no se pidió → no se requiere
// TSA-only → listo inmediatamente
```

### Casos especiales

**TSA-only (sin anchors solicitados):**
```typescript
events: [
  { kind: 'document.protected.requested' },
  { kind: 'tsa.confirmed' }
]
protection: []  // Sin anchors

shouldEnqueueArtifact() → true  // Listo inmediatamente
```

**Con anchors solicitados:**
```typescript
events: [
  { kind: 'document.protected.requested' },
  { kind: 'tsa.confirmed' },
  { kind: 'anchor', anchor: { network: 'polygon' } }
]
protection: ['polygon', 'bitcoin']  // Solicitó ambos

shouldEnqueueArtifact() → false  // Falta bitcoin
```

### No regeneración

La decisión previene regeneración innecesaria:
```typescript
// Si ya existe artifact → no encolar de nuevo
const hasArtifact = events.some((e) => e.kind === 'artifact.finalized');
if (hasArtifact) return false;
```

---

## 🔒 Commits relacionados

- (commit hash TBD) - Implementar D3 artifact con shadow mode

---

## 🎯 Próximos pasos

Con D1, D2, D3 y D4 aceptados, el siguiente paso es:

**Fase 3 - Cambio de autoridad**
- Mover autoridad del executor al motor canónico
- Las decisiones canónicas toman control
- Executor pasa a modo legacy/validación

---

## ⚠️ Notas importantes

1. **NO modificar decisión de artifact sin protocolo**
   - `shouldEnqueueArtifact()` congelada
   - Cualquier cambio requiere nueva validación completa

2. **Shadow mode permanece activo**
   - Los logs de comparación seguirán apareciendo
   - Permiten detectar regresiones futuras

3. **Autoridad sigue en executor**
   - La decisión actual mantiene control
   - La canónica solo valida en paralelo
   - Cambio de autoridad es Fase 3

4. **Caso TSA-only es especial**
   - Sin anchors solicitados → listo inmediatamente después de TSA
   - No espera confirmaciones de anchors que no existen
   - Simplifica flujo para usuarios que solo quieren TSA

5. **Idempotencia garantizada**
   - Una vez artifact.finalized emitido → no se regenera
   - Previene duplicación de artifacts
   - Mantiene integridad del evento log

---

**Validado por:** Tests automatizados + Shadow mode en executor
**Entorno:** Local (Supabase dev)
**Resultado:** ✅ ACEPTADO sin reservas
