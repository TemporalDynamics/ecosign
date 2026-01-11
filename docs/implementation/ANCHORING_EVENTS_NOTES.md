# ANCHORING EVENTS - NOTAS DE IMPLEMENTACIÓN

**Fecha:** 2026-01-11
**Contexto:** Workstream 3 - Observable Anchoring

---

## 📌 SEPARACIÓN CANÓNICA vs OBSERVABILIDAD

### Canon (Fuente de Verdad Legal)
**Ubicación:** `document_entities.events[]`

**Eventos:**
- `anchor` (kind) - Solo cuando blockchain CONFIRMA
- Inmutable, append-only
- Usado para derivar `protection_level`
- Defendible legalmente

**Reglas:**
- NUNCA editar
- NUNCA borrar
- NUNCA agregar si no hay confirmación real

---

### Observabilidad (Diagnóstico Operacional)
**Ubicación:** Tabla `events`

**Eventos:**
- `anchor.attempt` - Cada intento (incluyendo retries)
- `anchor.confirmed` - Confirmación (dual-write con canon)
- `anchor.failed` - Fallo terminal

**Reglas:**
- Best-effort logging
- NO bloquea flujo principal
- NO deduplicado
- Permite diagnóstico sin SSH

---

## ⚠️ NOTA IMPORTANTE: Workers Paralelos (Futuro)

**Estado actual (2026-01-11):**
- Workers ejecutan serialmente (1 worker por cron job)
- Cada documento se procesa una vez por ejecución
- `anchor.attempt` se loggea en cada loop del worker

**Si en el futuro se paraleliza o shardea:**

### Problema Potencial
Múltiples workers podrían procesar el mismo anchor simultáneamente:
```
Worker A → anchor.attempt (12:00:01)
Worker B → anchor.attempt (12:00:01)  // ← Duplicado
```

### Por Qué NO es Problema Hoy
- Cron jobs son seriales (no paralelos)
- Query usa LIMIT para evitar overlaps
- Exponential backoff espacía intentos

### Si se Paraleliza en Futuro
**Opciones:**

1. **Aceptar duplicados** (recomendado)
   - `anchor.attempt` es best-effort observability
   - NO es fuente de verdad
   - Duplicados no rompen nada

2. **Deduplicar con DB lock**
   ```sql
   SELECT * FROM anchors
   WHERE polygon_status = 'pending'
   FOR UPDATE SKIP LOCKED
   LIMIT 25;
   ```

3. **Añadir attempt_id único**
   ```typescript
   metadata: {
     attempt_id: `${anchor.id}-${Date.now()}-${workerId}`
   }
   ```

### Regla de Oro
> **Attempts are best-effort observability, not deduplicated.**

Si alguien pregunta "¿por qué hay 2 anchor.attempt al mismo tiempo?":
- Respuesta: Es observabilidad, no canon
- El canon está en `document_entities.events[]`
- Los duplicados son evidencia de retry/paralelismo

---

## 🎯 GARANTÍAS QUE SÍ DAMOS

✅ **Canon nunca duplica**
- `document_entities.events[]` tiene validación de unicidad
- Solo 1 anchor por network
- Enforced en `anchorHelper.appendAnchorEventFromEdge()`

✅ **Observabilidad es honest**
- Muestra TODOS los intentos reales
- No oculta retries
- Permite debugging

✅ **UI refleja, no afirma**
- UI lee de canon (`document_entities.events[]`)
- Observability es para admins/ops
- Nunca mostramos "confirmado" antes de tener evento canon

---

## 🧠 NOTAS CONCEPTUALES

### 1. `anchor.confirmed` (observability) ≠ `anchor` (canon)

Aunque se disparan juntos, **NO son el mismo evento**:

**`anchor.confirmed` (tabla `events`):**
- Evento observacional
- Incluye metadata operacional (attempts, timing, etc)
- Puede duplicarse en escenarios edge
- Para admins/ops

**`anchor` (kind en `document_entities.events[]`):**
- Verdad canónica
- Mínima, inmutable
- Única por network (enforced)
- Para defensa legal

**Por qué importa:**
- Evita confusión semántica futura
- Un perito lee el canon, no la telemetría
- Duplicados en observability NO invalidan el canon

---

### 2. Frase de Defensa Arquitectónica

**Cuando alguien pregunte:**
> "¿Por qué hay dos `anchor.attempt` al mismo tiempo?"

**Respuesta oficial:**

> **"Porque los attempts no son verdad, son evidencia operacional.**
> **El sistema no colapsa la realidad para verse prolijo.**
> **La verdad legal vive en el canon, no en la telemetría."**

**Implicaciones:**
- Los duplicados **aportan información**, no ruido
- Mostrar retries es **honestidad**, no bug
- La telemetría es **best-effort**, el canon es **strict**

**Analogía útil:**
- Canon = sentencia judicial (inmutable, única)
- Observability = bitácora policial (verbosa, completa)

Nadie cuestiona que la bitácora tenga anotaciones redundantes.
Lo importante es que la sentencia sea clara.

---

## 📚 REFERENCIAS

- Contrato: `docs/contratos/ANCHOR_EVENT_RULES.md`
- Implementación: `supabase/functions/_shared/anchorHelper.ts`
- Workers:
  - `supabase/functions/_legacy/process-polygon-anchors/index.ts`
  - `supabase/functions/_legacy/process-bitcoin-anchors/index.ts`

---

**Mantenedor:** Equipo de Arquitectura Canónica
**Última revisión:** 2026-01-11
