# Delivery Package: Modelo B Formalization
## 3 PRs, Definition of Done, No Excuses

**Versión**: 1.0
**Propósito**: Estructura operativa para convertir "conceptos correctos" en "enforcement inescapable"
**Audiencia**: Dev team, PR reviewers
**Objetivo**: Diff no se cierra sin que cumplan 3 PRs + checklist

---

## 🎯 Mensaje para el Dev (Léelo Primero)

```
Tu diff se evalúa por ENFORCEMENT, no por opiniones.

Entregame 3 PRs chicos (no 1 gigante):
  PR-1: Contracts (docs linked, normativa clara)
  PR-2: Invariants B1–B3 (validadores fail-hard + tests)
  PR-3: Observability + Compat Clarity (enqueue_source + trigger + direct inserts)

Si falta cualquiera, el diff está INCOMPLETO.

Objetivo operativo:
  - ECO intermedio es válido por firmante (no espera Bitcoin)
  - Policy evolutiva es determinística (B1–B3 enforced)
  - Listener canónico es la autoridad única (enqueue_source lo prueba)

Plazo: 1 semana. Comienza con PR-1.
```

---

## PR-1: "Contracts: Model B as Canonical Normative"

### Scope
Ubicar contratos en lugar canónico + linkear entre ellos.

### What Goes In

```
1. Asegurar que docs/contratos/MODELO_B_POLICY_EVOLUTION.md existe
   ✓ Estructura: Declaración, Modelo A vs B, Reglas B1–B3, EPI, Valid Intermediate, Invariantes
   ✓ Sección 12 "Checklist": qué cambia en el sistema

2. Actualizar docs/contratos/CONTRATO_ECO_ECOX.md
   ✓ Agregar ANTES de "8. Principio Rector" las 3 nuevas secciones:
     - 7.5 ECO Intermedio (por firmante) = snapshot válido
     - 7.6 ECO Final = institucional firmado
     - 7.7 Cómo verificar sin rechazar intermedios
   ✓ En sección 1 Definiciones, agregar cross-ref a MODELO_B_POLICY_EVOLUTION.md:
     "El Modelo B (Política Evolutiva) que EcoSign implementa está formalizado en MODELO_B_POLICY_EVOLUTION.md"

3. Agregar docs/contratos/DIRECT_INSERTS_COMPAT_FALLBACK.md
   ✓ Estructura: Tesis (NO autoridad paralela), Los 4 entrypoints, dedupe_key, Defense in Depth
   ✓ Sección "Roadmap de Remediación": fases hacia feature flags

4. Cross-references entre contratos
   ✓ MODELO_B_POLICY_EVOLUTION.md § 1 → link a CONTRATO_ECO_ECOX.md
   ✓ CONTRATO_ECO_ECOX.md § 7.5 → link a MODELO_B_POLICY_EVOLUTION.md
   ✓ docs/architecture/orquestación (si existe) → link a DIRECT_INSERTS_COMPAT_FALLBACK.md
   ✓ DIRECT_INSERTS_COMPAT_FALLBACK.md § 1 → link a MODELO_B_POLICY_EVOLUTION.md (define autoridad)
```

### Definition of DONE (PR-1)

- [ ] MODELO_B_POLICY_EVOLUTION.md existe en docs/contratos/
- [ ] CONTRATO_ECO_ECOX.md actualizado con secciones 7.5, 7.6, 7.7
- [ ] DIRECT_INSERTS_COMPAT_FALLBACK.md existe en docs/contratos/
- [ ] Al menos 3 cross-references entre los contratos (link bidireccionales)
- [ ] Búsqueda "valid_intermediate" en CONTRATO_ECO_ECOX.md retorna resultados (NO "draft/incomplete")
- [ ] Búsqueda "compat failover" en DIRECT_INSERTS_COMPAT_FALLBACK.md retorna, NO "parallel authority"
- [ ] Reviewer verifica que no hay duplicación de contenido entre los 3 (cada uno tiene scope claro)

**Merge Criteria**: Todos los checks arriba pasan. Reviewer de Arch confirma navegación entre docs.

**Timeline**: 1–2 días (mover archivos + agregar cross-refs)

---

## PR-2: "Invariants B1–B3: Fail-Hard Validation"

### Scope
Implementar validadores que rechacen violaciones de las 3 reglas.

### What Goes In

#### A. Validador B1: No-Null Required Evidence

**File**: `supabase/functions/_shared/eventValidator.ts` (crear si no existe)

```typescript
export function validateRequiredEvidenceNotNull(event: DocumentEvent): void {
  if (event.type !== 'document.protected.requested') {
    return;
  }

  const { required_evidence } = event.payload;

  if (
    !required_evidence ||
    !Array.isArray(required_evidence) ||
    required_evidence.length === 0
  ) {
    throw new ValidationError(
      'POLICY_VIOLATION: B1 Rule - required_evidence must be non-empty array',
      { event_id: event.id, provided: required_evidence }
    );
  }
}
```

**Tests**:
```typescript
// tests/validators/b1.test.ts
test('Rechaza required_evidence null', () => {
  const event = { type: 'document.protected.requested', payload: { required_evidence: null } };
  expect(() => validateRequiredEvidenceNotNull(event)).toThrow('B1 Rule');
});

test('Rechaza required_evidence vacío', () => {
  const event = { type: 'document.protected.requested', payload: { required_evidence: [] } };
  expect(() => validateRequiredEvidenceNotNull(event)).toThrow('B1 Rule');
});

test('Acepta array válido', () => {
  const event = { type: 'document.protected.requested', payload: { required_evidence: ['tsa'] } };
  expect(() => validateRequiredEvidenceNotNull(event)).not.toThrow();
});
```

---

#### B. Validador B2: Monotonicity by Stage

**File**: Mismo `eventValidator.ts`

```typescript
export function validateMonotonicityByStage(
  newEvent: DocumentEvent,
  previousEvents: DocumentEvent[]
): void {
  if (newEvent.type !== 'document.protected.requested') return;

  const prevEvent = previousEvents
    .filter(e => e.type === 'document.protected.requested')
    .pop();

  if (!prevEvent) return; // Primera vez

  const prevStage = prevEvent.payload.anchor_stage || 'initial';
  const newStage = newEvent.payload.anchor_stage || 'initial';
  const prev = prevEvent.payload.required_evidence || [];
  const next = newEvent.payload.required_evidence || [];

  if (prevStage === newStage) {
    if (!arrayEquals(prev, next)) {
      throw new ValidationError(
        'POLICY_VIOLATION: B2 Rule - required_evidence cannot change within same stage',
        { stage: newStage, prev, next }
      );
    }
  } else if (stageOrder(prevStage) < stageOrder(newStage)) {
    if (!isSubset(prev, next)) {
      throw new ValidationError(
        'POLICY_VIOLATION: B2 Rule - required_evidence can only grow between stages',
        { from: prevStage, to: newStage, prev, next }
      );
    }
  } else {
    throw new ValidationError(
      'POLICY_VIOLATION: B2 Rule - anchor_stage cannot go backwards',
      { from: prevStage, to: newStage }
    );
  }
}

function arrayEquals(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function isSubset(sub: string[], sup: string[]): boolean {
  return sub.every(x => sup.includes(x));
}

function stageOrder(s: string): number {
  return { initial: 0, intermediate: 1, final: 2 }[s] ?? -1;
}
```

**Tests**:
```typescript
// tests/validators/b2.test.ts
test('Permite crecer entre etapas', () => {
  const prev = { type: 'document.protected.requested', payload: { anchor_stage: 'initial', required_evidence: ['tsa', 'polygon'] } };
  const next = { type: 'document.protected.requested', payload: { anchor_stage: 'intermediate', required_evidence: ['tsa', 'polygon', 'bitcoin'] } };
  expect(() => validateMonotonicityByStage(next, [prev])).not.toThrow();
});

test('Rechaza disminuir entre etapas', () => {
  const prev = { type: 'document.protected.requested', payload: { anchor_stage: 'initial', required_evidence: ['tsa', 'polygon'] } };
  const next = { type: 'document.protected.requested', payload: { anchor_stage: 'intermediate', required_evidence: ['tsa'] } };
  expect(() => validateMonotonicityByStage(next, [prev])).toThrow('B2 Rule');
});

test('Rechaza cambio dentro de misma etapa', () => {
  const prev = { type: 'document.protected.requested', payload: { anchor_stage: 'initial', required_evidence: ['tsa'] } };
  const next = { type: 'document.protected.requested', payload: { anchor_stage: 'initial', required_evidence: ['tsa', 'polygon'] } };
  expect(() => validateMonotonicityByStage(next, [prev])).toThrow('B2 Rule');
});
```

---

#### C. Validador B3: TSA Minimum Requirement

**File**: Mismo `eventValidator.ts`

```typescript
export function validateMinimumEvidence(event: DocumentEvent): void {
  if (event.type !== 'document.protected.requested') return;

  const { required_evidence, policy_override } = event.payload;

  if (!required_evidence?.includes('tsa')) {
    if (policy_override === 'special_case') {
      console.warn('[B3-OVERRIDE]', 'TSA exempted via policy_override', {
        doc_id: event.document_entity_id,
      });
      // Opcionalmente: registrar en ECOX
      return;
    }

    throw new ValidationError(
      'POLICY_VIOLATION: B3 Rule - required_evidence must include "tsa" as minimum',
      { required_evidence, policy_override }
    );
  }
}
```

**Tests**:
```typescript
// tests/validators/b3.test.ts
test('Requiere "tsa" en required_evidence', () => {
  const event = { type: 'document.protected.requested', payload: { required_evidence: ['tsa', 'polygon'] } };
  expect(() => validateMinimumEvidence(event)).not.toThrow();
});

test('Rechaza sin "tsa"', () => {
  const event = { type: 'document.protected.requested', payload: { required_evidence: ['polygon', 'bitcoin'] } };
  expect(() => validateMinimumEvidence(event)).toThrow('B3 Rule');
});

test('Permite excepción con policy_override', () => {
  const event = { type: 'document.protected.requested', payload: { required_evidence: ['polygon'], policy_override: 'special_case' } };
  expect(() => validateMinimumEvidence(event)).not.toThrow();
});
```

---

#### D. Integration: Call Validators in appendEvent

**File**: Donde hoy se validan eventos (ej: `documentEventStore.ts`, `eventHandler.ts`)

```typescript
export async function appendEvent(event: DocumentEvent, documentEntity: DocumentEntity): Promise<void> {
  // Validar antes de insertar
  validateRequiredEvidenceNotNull(event);          // B1
  validateMonotonicityByStage(event, documentEntity.events);  // B2
  validateMinimumEvidence(event);                  // B3

  // Si todo pasó, insertar
  const updated = await supabase
    .from('document_entities')
    .update({ events: [...documentEntity.events, event] })
    .eq('id', documentEntity.id);

  if (updated.error) throw updated.error;
}
```

### Definition of DONE (PR-2)

- [ ] `eventValidator.ts` existe con 3 funciones: validateRequiredEvidenceNotNull, validateMonotonicityByStage, validateMinimumEvidence
- [ ] Cada validador lanza `ValidationError` específico con contexto
- [ ] Validadores se llaman en `appendEvent` ANTES de insertar
- [ ] Tests existen: mínimo 3 tests por validador (pass, fail, edge case)
- [ ] Todos los tests pasan (npm test)
- [ ] No hay validadores duplicados (no copiar lógica en varios lugares)
- [ ] Reviewer verifica que validadores NO pueden ser bypasseados sin código

**Merge Criteria**: Tests pasan 100%, validadores son fail-hard (no soft warnings).

**Timeline**: 2–3 días (implementar + test)

---

## PR-3: "Observability + Compat Clarity: enqueue_source"

### Scope
Marcar qué jobs vienen del listener (canonical) vs direct inserts (compat).

### What Goes In

#### A. Database Migration

**File**: `supabase/migrations/20260220180000_add_enqueue_source_to_executor_jobs.sql`

```sql
BEGIN;

ALTER TABLE executor_jobs
ADD COLUMN enqueue_source TEXT DEFAULT 'unknown'
  CHECK (enqueue_source IN ('canonical', 'compat_direct', 'manual'));

CREATE INDEX idx_executor_jobs_enqueue_source
ON executor_jobs(enqueue_source, created_at DESC);

-- Backfill historical data (heuristic: jobs with valid correlation_id and dedupe_key -> canonical)
UPDATE executor_jobs SET enqueue_source = 'canonical'
WHERE status IN ('succeeded', 'completed', 'running')
  AND dedupe_key IS NOT NULL
  AND correlation_id IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days';

-- Everything else unknown until updated by trigger/direct insert
COMMIT;
```

**Test**:
```typescript
test('enqueue_source column exists with constraint', async () => {
  const { error } = await supabase.from('executor_jobs').insert({
    correlation_id: uuid(),
    type: 'test_job',
    enqueue_source: 'invalid_value', // Should fail
  });
  expect(error).toBeDefined();
  expect(error.message).toContain('check_enqueue_source');
});

test('Valid enqueue_source values accepted', async () => {
  const values = ['canonical', 'compat_direct', 'manual'];
  for (const val of values) {
    const { error } = await supabase.from('executor_jobs').insert({
      correlation_id: uuid(),
      type: 'test_job',
      enqueue_source: val,
    });
    expect(error).toBeNull();
  }
});
```

---

#### B. Update Trigger: Mark as 'canonical'

**File**: `supabase/migrations/20260215190000_event_driven_executor_job_enqueuing.sql` (UPDATE)

In the `process_document_entity_events()` function, every INSERT should include:

```sql
-- BEFORE:
INSERT INTO executor_jobs (correlation_id, type, status, dedupe_key, payload)
VALUES (new.id, 'protect_document_v2', 'pending', dedupe_key, payload_json);

-- AFTER:
INSERT INTO executor_jobs (correlation_id, type, status, dedupe_key, payload, enqueue_source)
VALUES (new.id, 'protect_document_v2', 'pending', dedupe_key, payload_json, 'canonical');
```

**All INSERT statements in trigger must have `enqueue_source = 'canonical'`.**

---

#### C. Update 4 Direct Inserts: Mark as 'compat_direct'

**File 1**: `supabase/functions/record-protection-event/index.ts` (line ~230)

```typescript
// BEFORE:
const { data: job } = await supabase
  .from('executor_jobs')
  .insert({ correlation_id: documentEntityId, type: 'protect_document_v2', ... });

// AFTER:
const { data: job } = await supabase
  .from('executor_jobs')
  .insert({
    correlation_id: documentEntityId,
    type: 'protect_document_v2',
    enqueue_source: 'compat_direct',  // ← ADD THIS
    ...
  });
```

Repeat for:
- `apply-signer-signature/index.ts` line ~1284 (run_tsa)
- `apply-signer-signature/index.ts` line ~1649 (protect_document_v2)
- `run-tsa/index.ts` line ~226 (generate_signature_evidence)

**Each must have exactly one line added: `enqueue_source: 'compat_direct',`**

---

#### D. Health Check Query (Optional, but Recommended)

Create a SQL query or dashboard that shows:

```sql
SELECT
  enqueue_source,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage,
  DATE_TRUNC('hour', created_at) as hour
FROM executor_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY enqueue_source, DATE_TRUNC('hour', created_at)
ORDER BY hour DESC, enqueue_source;

-- Expected output (HEALTHY):
-- canonical      | 143 | 94.1%  | 2026-02-20 15:00
-- compat_direct  | 9   | 5.9%   | 2026-02-20 15:00
```

This query should live in:
- Grafana dashboard, or
- Monitoring script, or
- As a comment in `docs/ops/` for manual checking

---

### Definition of DONE (PR-3)

- [ ] Migration creates enqueue_source column with CHECK constraint
- [ ] Trigger sets `enqueue_source = 'canonical'` on ALL INSERT statements
- [ ] 4 direct inserts set `enqueue_source = 'compat_direct'`
- [ ] Migration tests pass (column constraint works)
- [ ] E2E test: trigger enqueues job with enqueue_source='canonical'
- [ ] E2E test: direct insert enqueues job with enqueue_source='compat_direct'
- [ ] Health check query runs and shows distribution (no errors)
- [ ] Reviewer manually runs query on staging, sees > 90% canonical

**Merge Criteria**: Migration deploys cleanly, all 4 direct inserts are updated, tests pass.

**Timeline**: 1–2 días (migration + 4 one-line updates + tests)

---

## Overall Definition of DONE (All 3 PRs)

### Docs
- [ ] Cross-references between contracts exist (bidirectional)
- [ ] "valid_intermediate" appears in ECO docs
- [ ] "compat failover" appears in direct-inserts doc
- [ ] No "draft/incomplete" terminology (only "valid_intermediate")

### Invariants
- [ ] B1 validator rejects null
- [ ] B2 validator rejects shrinking between stages
- [ ] B3 validator requires TSA
- [ ] Tests fail if you remove any validator
- [ ] Validadores are called before events are persisted

### Code
- [ ] `enqueue_source` column exists
- [ ] Trigger sets 'canonical'
- [ ] 4 direct inserts set 'compat_direct'
- [ ] Health check query works

### Outcome
- ECO intermedio es válido sin esperar Bitcoin
- Policy evolutiva es determinística (B1–B3 enforced)
- Listener canónico es la autoridad única (comprobable vía enqueue_source)

---

## How to Review (For Arch/Lead)

### PR-1 Review
1. Open each contract PDF view
2. Search for: "valid_intermediate", "compat failover", "B1", "B2", "B3"
3. Click links to verify cross-references work
4. Ask: "Is it clear that Modelo B is the ONLY model?"

### PR-2 Review
1. Look at test file: does every test have `expect(...).toThrow()` or `expect(...).not.toThrow()`?
2. Ask: "If I delete any validator, does a test fail?"
3. Run tests locally: `npm test -- eventValidator.test.ts`
4. Search codebase: "validateRequiredEvidenceNotNull" — appears in appendEvent?

### PR-3 Review
1. Run migration: does it create column and constraint without errors?
2. Check trigger: every INSERT has `enqueue_source = 'canonical'`?
3. Check 4 direct inserts: have exactly `enqueue_source: 'compat_direct'`?
4. Run health query on staging: is it > 90% canonical?

---

## Red Flags (If You See These, Reject the PR)

```
❌ "Modelo A might still be useful in the future"
   → REJECT. Modelo B is official, A is dead.

❌ "Validador logs warning but doesn't throw"
   → REJECT. Must be fail-hard, not soft warnings.

❌ "enqueue_source is set to 'unknown' or defaults"
   → REJECT. Must be explicitly 'canonical' or 'compat_direct'.

❌ "ECO status still says 'draft' or 'incomplete'"
   → REJECT. Must be 'valid_intermediate' or 'valid_final'.

❌ "Tests pass but they're not testing the validator"
   → REJECT. Ask: "Does test fail if validator is deleted?"

❌ "Only 2 of 4 direct inserts were updated"
   → REJECT. All 4 must be marked 'compat_direct'.
```

---

## Success Metrics (After All 3 PRs Merge)

1. **Docs**: Searchable, cross-referenced, single source of truth (Modelo B)
2. **Invariants**: Rejecting violations automatically (no manual policing)
3. **Observability**: Can see % canonical vs compat_direct, can detect listener degradation
4. **UX**: "Valid intermediate" is shown as positive state (not error)
5. **Operations**: No more debates about "mutable vs immutable" (B1–B3 enforce it)

---

## Timeline (Total)

```
PR-1 (Contracts):        1–2 días
PR-2 (Invariants):       2–3 días
PR-3 (Observability):    1–2 días

Total: ~1 week (if no blockers)

Parallelizable: PR-1 and PR-2 can start simultaneously (independent)
PR-3 depends on nothing, can also start immediately
```

---

## Sign-Off

**This delivery package is NON-NEGOTIABLE.**

If the dev tries to merge "just contracts" without invariants, say:
```
"Contracts alone don't enforce Modelo B. Come back with tests that fail if you break B1–B3."
```

If they ask "can we add this later?", say:
```
"No. The diff is incomplete without all 3 PRs. Merge them together."
```

If they say "this is too much code", say:
```
"It's 3 validators (~150 lines total) + 1 migration + updating 4 direct inserts (1 line each).
That's not much. It's just enforcement."
```

---

**Ownership**: [Dev Lead]
**Reviewer**: [Arch Lead]
**Timeline**: Week of 2026-02-20
**Status**: Ready to assign to dev team
