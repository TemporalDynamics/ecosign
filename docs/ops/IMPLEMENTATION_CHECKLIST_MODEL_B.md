# Implementation Checklist: Modelo B Formalization
## Qué Código Cambia, Qué Tests Se Agregan, Qué Queries Se Crean

**Versión**: 1.0
**Propósito**: Guía operativa para cerrar la dualidad Modelo A vs B
**Audiencia**: Engineering Team
**Timeline**: 2-3 semanas
**Dificultad**: Media (validadores + tests, no redesign)

---

## 🟥 BLOQUERS (CRÍTICO - Sin Estos No Puedes Mergear)

### BLOCKER #1: Agregar `enqueue_source` a executor_jobs

**Why**: Sin esto no hay forma de saber si un job vino del listener (canonical) o direct insert (compat).

**What**: Migration SQL

```sql
-- File: supabase/migrations/20260220_add_enqueue_source_to_executor_jobs.sql
-- Timestamp: 20260220180000

BEGIN;

-- Agregar columna
ALTER TABLE executor_jobs
ADD COLUMN enqueue_source TEXT DEFAULT 'unknown';

-- Agregar constraint
ALTER TABLE executor_jobs
ADD CONSTRAINT check_enqueue_source
CHECK (enqueue_source IN ('canonical', 'compat_direct', 'manual', 'unknown'));

-- Agregar índice (para queries de observabilidad)
CREATE INDEX idx_executor_jobs_enqueue_source
ON executor_jobs(enqueue_source, created_at DESC);

-- Migración data histórico: asignar basado en correlación
-- (Heurístico: si dedupe_key está presente y correlación OK → probablemente canonical)
UPDATE executor_jobs SET enqueue_source = 'canonical'
WHERE status IN ('succeeded', 'running')
  AND dedupe_key IS NOT NULL
  AND correlation_id IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days';

UPDATE executor_jobs SET enqueue_source = 'unknown'
WHERE enqueue_source = 'unknown';

COMMIT;
```

**Where**: `/supabase/migrations/` (nuevo archivo)

**Tests**:
```typescript
// tests/database/enqueue_source.test.ts
test('enqueue_source column exists and has correct constraint', async () => {
  // Verificar que constraint rechaza valores inválidos
  await expect(
    db.from('executor_jobs').insert({
      ..., enqueue_source: 'invalid_value'
    })
  ).rejects.toThrow('check_enqueue_source');
});
```

**Acceptance**:
- [ ] Migration corre sin errores en staging
- [ ] Constraint previene valores inválidos
- [ ] Índice es creado exitosamente
- [ ] Query `SELECT COUNT(*) ... GROUP BY enqueue_source` funciona

---

### BLOCKER #2: Validador B1 (No-Null required_evidence)

**Why**: Tu prod tiene eventos con `required_evidence = null`. Esto viola el contrato. Hay que frenar nuevos.

**What**: Validador en `appendEvent`

**Where**: `supabase/functions/_shared/eventValidator.ts` (crear si no existe)

```typescript
// File: supabase/functions/_shared/eventValidator.ts

import { DocumentEvent } from './types';
import { observability } from './observability';

export function validateRequiredEvidenceNotNull(event: DocumentEvent): void {
  // Solo validar eventos de tipo document.protected.requested
  if (event.type !== 'document.protected.requested') {
    return;
  }

  const payload = event.payload;

  // Regla B1: required_evidence DEBE ser array no vacío
  if (
    !payload.required_evidence ||
    !Array.isArray(payload.required_evidence) ||
    payload.required_evidence.length === 0
  ) {
    const error = new ValidationError(
      'INVALID_POLICY: required_evidence must be non-empty array (Modelo B Rule B1)',
      {
        event_type: event.type,
        document_entity_id: event.document_entity_id,
        provided_value: payload.required_evidence,
        policy_version: payload.policy_version,
      }
    );

    // Log para debugging
    console.error('[B1-VIOLATION]', error.message, error.context);

    // Métrica
    observability.increment('validation.b1_violation', {
      policy_version: payload.policy_version || 'unknown',
    });

    // Rechazar evento
    throw error;
  }

  // Si pasó validación, registrar métrica
  observability.increment('validation.b1_passed', {
    required_evidence_count: payload.required_evidence.length,
    has_tsa: payload.required_evidence.includes('tsa'),
    policy_version: payload.policy_version,
  });
}
```

**Where To Call**: En `appendEvent` / `recordEvent` handler

```typescript
// En supabase/functions/_shared/documentEventStore.ts (o similar)

export async function appendEvent(event: DocumentEvent): Promise<void> {
  // Ejecutar validadores ANTES de insertarlo
  validateRequiredEvidenceNotNull(event);  // ← B1
  validateMonotonicityByStage(event);       // ← B2 (abajo)
  validateMinimumEvidence(event);           // ← B3 (abajo)

  // Si todo pasó, insertar
  const { data, error } = await supabase
    .from('document_entities')
    .update({ events: [...current_events, event] })
    .eq('id', event.document_entity_id);

  if (error) throw error;
}
```

**Tests**:
```typescript
// tests/validators/b1_no_null.test.ts

describe('Validator B1: required_evidence not null', () => {
  test('Rechaza required_evidence = null', async () => {
    const event: DocumentEvent = {
      type: 'document.protected.requested',
      payload: { required_evidence: null }, // ← INVÁLIDO
    };

    expect(() => validateRequiredEvidenceNotNull(event))
      .toThrow('required_evidence must be non-empty array');
  });

  test('Rechaza required_evidence = []', async () => {
    const event: DocumentEvent = {
      type: 'document.protected.requested',
      payload: { required_evidence: [] }, // ← INVÁLIDO (vacío)
    };

    expect(() => validateRequiredEvidenceNotNull(event))
      .toThrow('required_evidence must be non-empty array');
  });

  test('Acepta required_evidence = ["tsa", "polygon"]', async () => {
    const event: DocumentEvent = {
      type: 'document.protected.requested',
      payload: {
        required_evidence: ['tsa', 'polygon'], // ← VÁLIDO
        policy_version: 'v1',
      },
    };

    expect(() => validateRequiredEvidenceNotNull(event))
      .not.toThrow();
  });

  test('Métrica se registra en observabilidad', async () => {
    const event = {
      type: 'document.protected.requested',
      payload: { required_evidence: ['tsa'] },
    };

    validateRequiredEvidenceNotNull(event);

    expect(observability.increment).toHaveBeenCalledWith(
      'validation.b1_passed',
      expect.objectContaining({ required_evidence_count: 1 })
    );
  });
});
```

**Acceptance**:
- [ ] Validator rechaza null, undefined, []
- [ ] Validator acepta arrays válidos
- [ ] Métrica se registra correctamente
- [ ] Tests pasan 100%

---

### BLOCKER #3: Validador B2 (Monotonicidad por Etapa)

**Why**: Prevenir que required_evidence disminuya entre etapas (violaría el contrato).

**What**: Comparar previo vs nuevo

**Where**: `supabase/functions/_shared/eventValidator.ts` (mismo archivo que B1)

```typescript
export function validateMonotonicityByStage(
  newEvent: DocumentEvent,
  previousEvents: DocumentEvent[]
): void {
  // Solo validar document.protected.requested
  if (newEvent.type !== 'document.protected.requested') {
    return;
  }

  // Buscar evento anterior del mismo tipo
  const previousProtectionEvent = previousEvents
    .filter(e => e.type === 'document.protected.requested')
    .pop(); // Último

  if (!previousProtectionEvent) {
    // Primera ocurrencia, no hay anterior para comparar
    return;
  }

  const prevStage = previousProtectionEvent.payload.anchor_stage || 'initial';
  const newStage = newEvent.payload.anchor_stage || 'initial';
  const prevRequired = previousProtectionEvent.payload.required_evidence || [];
  const newRequired = newEvent.payload.required_evidence || [];

  // Comparar según stage
  if (prevStage === newStage) {
    // Misma etapa: required_evidence DEBE ser idéntico
    if (!arraysEqual(prevRequired, newRequired)) {
      throw new ValidationError(
        'POLICY_VIOLATION: Within same anchor_stage, required_evidence cannot change (B2)',
        {
          stage: newStage,
          previous: prevRequired,
          new: newRequired,
        }
      );
    }
  } else if (stageOrder(prevStage) < stageOrder(newStage)) {
    // Etapa avanzó: previo DEBE ser subset de nuevo
    if (!isSubset(prevRequired, newRequired)) {
      throw new ValidationError(
        'POLICY_VIOLATION: required_evidence can only grow between stages (B2 monotonic)',
        {
          previous_stage: prevStage,
          new_stage: newStage,
          previous: prevRequired,
          new: newRequired,
          missing_from_new: prevRequired.filter(x => !newRequired.includes(x)),
        }
      );
    }
  } else {
    // Etapa retrocedió: NUNCA permitido
    throw new ValidationError(
      'POLICY_VIOLATION: anchor_stage cannot go backwards',
      {
        previous: prevStage,
        new: newStage,
      }
    );
  }

  // Métrica
  observability.increment('validation.b2_monotonicity_passed', {
    stage_transition: `${prevStage}_to_${newStage}`,
    growth: newRequired.length - prevRequired.length,
  });
}

// Helpers
function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function isSubset(subset: string[], superset: string[]): boolean {
  return subset.every(x => superset.includes(x));
}

function stageOrder(stage: string): number {
  const order = { initial: 0, intermediate: 1, final: 2 };
  return order[stage] ?? -1;
}
```

**Tests**:
```typescript
// tests/validators/b2_monotonicity.test.ts

describe('Validator B2: Monotonicity by stage', () => {

  test('Permite crecer required_evidence entre etapas', async () => {
    const prev = {
      type: 'document.protected.requested',
      payload: {
        anchor_stage: 'initial',
        required_evidence: ['tsa', 'polygon']
      },
    };

    const next = {
      type: 'document.protected.requested',
      payload: {
        anchor_stage: 'intermediate',
        required_evidence: ['tsa', 'polygon', 'bitcoin'] // ← creció
      },
    };

    expect(() => validateMonotonicityByStage(next, [prev]))
      .not.toThrow();
  });

  test('Rechaza disminuir required_evidence entre etapas', async () => {
    const prev = {
      type: 'document.protected.requested',
      payload: {
        anchor_stage: 'initial',
        required_evidence: ['tsa', 'polygon']
      },
    };

    const next = {
      type: 'document.protected.requested',
      payload: {
        anchor_stage: 'intermediate',
        required_evidence: ['tsa'] // ← DISMINUYÓ, inválido
      },
    };

    expect(() => validateMonotonicityByStage(next, [prev]))
      .toThrow('required_evidence can only grow');
  });

  test('Rechaza cambio dentro de misma etapa', async () => {
    const prev = {
      type: 'document.protected.requested',
      payload: {
        anchor_stage: 'initial',
        required_evidence: ['tsa', 'polygon']
      },
    };

    const next = {
      type: 'document.protected.requested',
      payload: {
        anchor_stage: 'initial', // ← MISMA etapa
        required_evidence: ['tsa', 'polygon', 'bitcoin'] // ← CAMBIO, inválido
      },
    };

    expect(() => validateMonotonicityByStage(next, [prev]))
      .toThrow('Within same anchor_stage, required_evidence cannot change');
  });
});
```

**Acceptance**:
- [ ] Permite crecer entre etapas
- [ ] Rechaza disminuir entre etapas
- [ ] Rechaza cambios dentro de misma etapa
- [ ] Rechaza etapa retrocediendo
- [ ] Tests pasan 100%

---

### BLOCKER #4: Validador B3 (Mínimo Probatorio - TSA Base)

**Why**: TSA es el piso obligatorio. Sin TSA, el ECO no tiene "reloj de pared" confiable.

**What**: Validar que `"tsa"` esté en required_evidence

**Where**: `supabase/functions/_shared/eventValidator.ts`

```typescript
export function validateMinimumEvidence(event: DocumentEvent): void {
  if (event.type !== 'document.protected.requested') {
    return;
  }

  const payload = event.payload;
  const required = payload.required_evidence || [];
  const override = payload.policy_override;

  if (!required.includes('tsa')) {
    if (override === 'special_case') {
      // Permitir, pero auditar
      observability.increment('validation.b3_override', {
        override_type: 'special_case',
        required_evidence: required,
      });

      console.warn('[B3-OVERRIDE]', 'TSA exempted via policy_override', {
        document_entity_id: event.document_entity_id,
        override: override,
      });

      // Registrar en ECOX (para auditoría)
      // Nota: esto es pseudo-código, implementación depende de tu stack
      // await recordECOXEvent({
      //   type: 'POLICY_OVERRIDE',
      //   details: { override_type: 'special_case', required_evidence: required }
      // });

      return;
    } else {
      // Rechazar sin override
      throw new ValidationError(
        'INVALID_POLICY: required_evidence must include "tsa" as minimum (B3)',
        {
          required_evidence: required,
          missing: 'tsa',
          policy_override: override,
        }
      );
    }
  }

  observability.increment('validation.b3_passed', {
    required_evidence_count: required.length,
  });
}
```

**Tests**:
```typescript
// tests/validators/b3_minimum_evidence.test.ts

describe('Validator B3: Minimum evidence (TSA required)', () => {

  test('Acepta required_evidence con TSA', async () => {
    const event = {
      type: 'document.protected.requested',
      payload: { required_evidence: ['tsa', 'polygon'] },
    };

    expect(() => validateMinimumEvidence(event))
      .not.toThrow();
  });

  test('Rechaza required_evidence sin TSA', async () => {
    const event = {
      type: 'document.protected.requested',
      payload: { required_evidence: ['polygon', 'bitcoin'] }, // ← sin tsa
    };

    expect(() => validateMinimumEvidence(event))
      .toThrow('required_evidence must include "tsa"');
  });

  test('Permite excepción con policy_override=special_case', async () => {
    const event = {
      type: 'document.protected.requested',
      payload: {
        required_evidence: ['polygon'],
        policy_override: 'special_case', // ← override permitido
      },
    };

    expect(() => validateMinimumEvidence(event))
      .not.toThrow();
  });
});
```

**Acceptance**:
- [ ] Requiere "tsa" en array
- [ ] Rechaza sin "tsa" (salvo override)
- [ ] Permite override con audit trail
- [ ] Tests pasan 100%

---

## 🟨 IMPORTANTES (Agrega Observabilidad)

### IMPORTANTE #1: Actualizar Trigger SQL (enqueue_source = 'canonical')

**Why**: Diferenciar jobs que vinieron del listener vs direct inserts.

**Where**: `supabase/migrations/20260215190000_event_driven_executor_job_enqueuing.sql` (ACTUALIZAR)

```sql
-- En la función process_document_entity_events(), cuando haces INSERT:

INSERT INTO executor_jobs (
  correlation_id,
  type,
  status,
  dedupe_key,
  payload,
  enqueue_source  -- ← AGREGAR ESTA LÍNEA
)
VALUES (
  new.id,
  'protect_document_v2',
  'pending',
  dedupe_key_value,
  payload_json,
  'canonical'  -- ← FIJAR A 'canonical'
);
```

**Acceptance**:
- [ ] Todos los INSERT en trigger tienen `enqueue_source = 'canonical'`
- [ ] Migration deploya sin error

---

### IMPORTANTE #2: Actualizar Los 4 Direct Inserts (enqueue_source = 'compat_direct')

**Why**: Marcar cuáles jobs vinieron del compat fallback.

**Where**: Los 4 archivos listados en `DIRECT_INSERTS_COMPAT_FALLBACK.md`

```typescript
// En record-protection-event/index.ts (línea ~230):
const { data: job, error } = await supabase
  .from('executor_jobs')
  .insert({
    correlation_id: documentEntityId,
    type: 'protect_document_v2',
    dedupe_key: dedupeKey,
    status: 'pending',
    payload: { /* ... */ },
    enqueue_source: 'compat_direct',  // ← AGREGAR
  });

// Idéntico en los otros 3 archivos
```

**Acceptance**:
- [ ] Los 4 direct inserts tienen `enqueue_source = 'compat_direct'`
- [ ] Tests E2E todavía pasan

---

### IMPORTANTE #3: Crear Métrica de Observabilidad

**Why**: Monitor si listener está healthy (% canonical vs compat_direct).

**Where**: `supabase/functions/_shared/observability.ts` o dashboard SQL

```typescript
// Función helper para dashboards

export async function getEnqueueSourceMetrics(hours: number = 24) {
  const query = `
    SELECT
      enqueue_source,
      COUNT(*) as count,
      ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage,
      DATE_TRUNC('hour', created_at) as hour
    FROM executor_jobs
    WHERE created_at > NOW() - INTERVAL '${hours} hours'
    GROUP BY enqueue_source, DATE_TRUNC('hour', created_at)
    ORDER BY hour DESC, enqueue_source;
  `;

  return await supabase.from('executor_jobs').raw(query);
}
```

**Dashboard Alert**:
```sql
-- Si compat_direct > 10% en última hora → posible listener down
SELECT
  enqueue_source,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as pct
FROM executor_jobs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY enqueue_source
HAVING enqueue_source = 'compat_direct' AND COUNT(*) > (SELECT COUNT(*) * 0.1 FROM executor_jobs WHERE created_at > NOW() - INTERVAL '1 hour');
```

**Acceptance**:
- [ ] Query devuelve % canonical vs compat_direct
- [ ] Dashboard muestra métrica
- [ ] Alert se dispara si compat_direct > 10%

---

## 🟩 TESTS (E2E sin Direct Inserts)

### TEST #1: Flujo Completo Canonical-Only

**Why**: Probar que sin direct inserts, listener encola todo correctamente.

**Where**: `tests/e2e/canonical-only-flow.test.ts` (nuevo archivo)

```typescript
// tests/e2e/canonical-only-flow.test.ts

describe('E2E: Canonical-Only Flow (No Direct Inserts)', () => {

  // Setup
  beforeAll(async () => {
    // Desactivar todos los direct inserts (si hay feature flags)
    await disableDirectInsertFlags();
  });

  afterEach(async () => {
    // Cleanup
    await cleanupTestData();
  });

  test('1. Record protection event → listener encolada protect_document_v2', async () => {
    const doc = await createTestDocument();

    // Llamar API (sin direct insert)
    await callRecordProtectionEvent(doc);

    // Esperar a que trigger dispare
    await wait(2000);

    // Verificar job existe en executor_jobs
    const job = await getJob(doc.id, 'protect_document_v2');
    expect(job).toBeDefined();
    expect(job.enqueue_source).toBe('canonical');
    expect(job.status).toBe('pending');
  });

  test('2. Apply signature → listener encolada run_tsa', async () => {
    const doc = await completeProtectionFlow();
    const signer = await createTestSigner();

    // Firmar (sin direct insert)
    await callApplySignature(doc, signer);

    // Esperar trigger
    await wait(2000);

    // Verificar TSA job fue encolada por listener
    const jobs = await getJobsByType(doc.id, 'run_tsa');
    expect(jobs.length).toBeGreaterThan(0);

    const canonical_jobs = jobs.filter(j => j.enqueue_source === 'canonical');
    expect(canonical_jobs.length).toBeGreaterThan(0);
  });

  test('3. Complete flow: 5 signers, no direct inserts', async () => {
    // Setup: inicio de flujo
    const flow = await initiateSignatureFlow({
      document_id: uuid(),
      required_signers: 5,
      required_evidence: ['tsa', 'polygon', 'bitcoin'],
    });

    // Simular 5 firmas (vía listener solamente)
    for (let i = 0; i < 5; i++) {
      const signer = flow.signers[i];
      await callApplySignature(flow.document_id, signer);
      await wait(1000); // Dar tiempo a trigger
    }

    // Ejecutar todos los jobs
    await executeAllPendingJobs(flow.document_id);

    // Verificar resultado final
    const finalDoc = await getDocument(flow.document_id);
    expect(finalDoc.overall_status).toBe('certified');
    expect(finalDoc.signature_count).toBe(5);

    // Verificar todos los jobs fueron canonical
    const allJobs = await getJobsByDocument(flow.document_id);
    const compat_count = allJobs.filter(
      j => j.enqueue_source === 'compat_direct'
    ).length;
    expect(compat_count).toBe(0); // ← CRÍTICO: cero compat direct
  });

  test('4. Policy evolution (Modelo B) → listener maneja correctamente', async () => {
    const doc = await createDocumentWithPolicy(['tsa', 'polygon']);

    // Agregar Bitcoin a policy
    await updatePolicy(doc.id, ['tsa', 'polygon', 'bitcoin']);

    // Esperar a que listener procese
    await wait(2000);

    // Verificar que se encoló nuevo protect_document_v2 job
    const jobs = await getJobsByType(doc.id, 'protect_document_v2');
    expect(jobs.length).toBeGreaterThan(1); // Al menos 2: una inicial, una tras cambio

    // Todos canonical
    jobs.forEach(job => {
      expect(job.enqueue_source).toBe('canonical');
    });
  });
});
```

**Acceptance**:
- [ ] Todos los tests pasan sin direct inserts
- [ ] Jobs son encolados por listener (enqueue_source = 'canonical')
- [ ] No hay compat_direct en este flujo

---

## 🟩 MIGRATION: Data Histórico (Opcional pero Recomendado)

**Why**: Limpiar tu prod de eventos con required_evidence = null.

**What**: Script de remediación

```sql
-- File: supabase/migrations/20260221_remediate_null_required_evidence.sql

BEGIN;

-- Ver cuántos eventos problemáticos tienes
SELECT COUNT(*) as null_count
FROM document_entities,
     jsonb_array_elements(events) as event
WHERE event->>'type' = 'document.protected.requested'
  AND (event->'payload'->>'required_evidence' IS NULL
       OR event->'payload'->>'required_evidence' = '');

-- Si count > 0, considerar estrategia:
-- Opción A: Llenar con default (ej: ["tsa"])
UPDATE document_entities
SET events = jsonb_set(
      events,
      '{' || idx || ',payload,required_evidence}',
      '["tsa"]'::jsonb
    )
FROM (
  SELECT id, idx
  FROM document_entities,
       jsonb_array_elements(events) WITH ORDINALITY as event(val, idx)
  WHERE event.val->>'type' = 'document.protected.requested'
    AND (event.val->'payload'->>'required_evidence' IS NULL
         OR event.val->'payload'->>'required_evidence' = '')
) sub
WHERE document_entities.id = sub.id;

COMMIT;
```

**Acceptance**:
- [ ] Query show cuántos eventos null hay
- [ ] Después de migración, cero eventos null
- [ ] Validador B1 ahora rechaza nuevos nulls

---

## 📊 CHECKLIST DE ACEPTACIÓN FINAL

### Código
- [ ] Migration `enqueue_source` mergeada
- [ ] Validadores B1, B2, B3 implementados y testados
- [ ] Los 4 direct inserts marcan `enqueue_source = 'compat_direct'`
- [ ] Trigger SQL marca `enqueue_source = 'canonical'`
- [ ] Tests E2E canonical-only pasan 100%

### Documentación
- [ ] `MODELO_B_POLICY_EVOLUTION.md` publicada
- [ ] `CONTRATO_ECO_ECOX.md` actualizado
- [ ] `DIRECT_INSERTS_COMPAT_FALLBACK.md` publicada
- [ ] Este checklist completado

### Observabilidad
- [ ] Métrica `enqueue_source` visible en dashboard
- [ ] Alert si compat_direct > 10% en 24h
- [ ] Logs muestran qué validador rechazó qué evento

### QA
- [ ] Staging deployment sin errores
- [ ] No hay regresiones en E2E existentes
- [ ] Tests nuevos pasan 100%
- [ ] Métricas muestran > 90% canonical jobs

---

## 🎯 Resumen: Qué Cambia Y Qué NO Cambia

### ✅ Cambia (Pequeño Delta)
- [x] 1 nueva migration (enqueue_source)
- [x] 3 funciones validador (~100 líneas de código)
- [x] 1 test E2E suite (~200 líneas)
- [x] Actualizar 4 direct inserts (1 línea cada una)
- [x] Actualizar 1 trigger SQL (1 línea)

### ❌ NO Cambia (Arquitectura Intacta)
- [x] Listener trigger sigue siendo "autoridad única"
- [x] Deduplicación sigue funcionando igual
- [x] ECO generation no cambia
- [x] Flujos de usuario no cambian
- [x] Ningún breaking change

### 📈 Impacto
- Modelo B está **formalizado** (contrato + código)
- Ambigüedad está **cerrada** (B1–B3 son vinculantes)
- Observabilidad está **mejorada** (enqueue_source)
- Confianza está **aumentada** (tests E2E)

---

## ⏰ Timeline Realista

```
Día 1-2: Implementar validadores B1–B2–B3
Día 3: Implementar migration + tests E2E
Día 4: Actualizar 4 direct inserts
Día 5: QA, staging, validar métricas
Día 6-7: Documenta hallazgos, publica docs

Total: 1 semana (si no hay blockers sorpresa)
```

---

**Owner**: Engineering Lead
**Reviewer**: Architecture
**Status**: Ready to implement
