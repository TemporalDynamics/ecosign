# Daily Standup: Week 1 Execution
## Día Por Día: Qué Codea, Cómo Validar, Qué Esperar

**Semana**: 2026-02-20 a 2026-02-28
**Dev**: [Experto asignado]
**Owner/Validador**: [Tu nombre]
**Formato**: Cada día = tarea + acceptance criteria + micro-validación

---

## 🎯 Macro: 3 PRs, 1 Semana

```
PR-1 (Contracts):       Día 1–2
PR-2 (Validators B1–B3): Día 3–4
PR-3 (Observability):    Día 5–6
Buffer:                  Día 7 (fixes, docs finales)
```

---

## ⏰ DÍA 1–2: PR-1 (Contracts + Cross-References)

### Tarea
Linkar los 3 contratos de forma que sean navegables. No duplicar contenido.

### Qué Hacer (Específico)

1. **Ubicar/verificar que existen estos 3 archivos**:
   ```
   docs/contratos/MODELO_B_POLICY_EVOLUTION.md
   docs/contratos/CONTRATO_ECO_ECOX.md
   docs/contratos/DIRECT_INSERTS_COMPAT_FALLBACK.md
   ```

2. **En MODELO_B_POLICY_EVOLUTION.md (§1)**, agregar:
   ```markdown
   ## Relación con otros contratos

   Este contrato formaliza Modelo B.
   Ver también:
   - [ECO/ECOX Separation](./CONTRATO_ECO_ECOX.md) - Define validez intermedia
   - [Direct Inserts Compat Failover](./DIRECT_INSERTS_COMPAT_FALLBACK.md) - Explica autoridad única
   ```

3. **En CONTRATO_ECO_ECOX.md (§1 Definiciones)**, agregar antes de "1.1 ECO":
   ```markdown
   ### Contexto Arquitectónico
   EcoSign implementa Modelo B (Política Evolutiva) formalizado en
   [MODELO_B_POLICY_EVOLUTION.md](./MODELO_B_POLICY_EVOLUTION.md).
   Esto permite que ECO intermedio sea válido sin esperar a policy final.
   ```

4. **En DIRECT_INSERTS_COMPAT_FALLBACK.md (§1)**, agregar:
   ```markdown
   La autoridad única (trigger canónico) es formalizada en
   [MODELO_B_POLICY_EVOLUTION.md](./MODELO_B_POLICY_EVOLUTION.md) § 1.
   ```

5. **Verificar terminología**:
   - Search "valid_intermediate" en CONTRATO_ECO_ECOX.md → debe encontrar 10+ matches
   - Search "draft" o "incomplete" en CONTRATO_ECO_ECOX.md → debe ser CERO matches
   - Search "compat failover" en DIRECT_INSERTS_COMPAT_FALLBACK.md → debe encontrar matches
   - Search "parallel authority" → debe ser CERO

### Acceptance Criteria
- [ ] 3 archivos existen en docs/contratos/
- [ ] Cross-references son bidireccionales (links funcionan)
- [ ] No hay duplicación de contenido (cada doc tiene scope claro)
- [ ] "valid_intermediate" aparece correcto en ECO doc
- [ ] "compat failover" está clara en direct-inserts doc
- [ ] Reviewer puede navegar entre los 3 documentos

### Micro-Validación (Pedile Al Dev)
```
"Enviame los 3 archivos con links agregados. Voy a verificar:
1. Que los links funcionan (no URLs rotas)
2. Que no hay duplicación (cada doc dice algo único)
3. Que la terminología es consistente (valid_intermediate, compat failover)"
```

### Merge Criteria
PR-1 se mergea cuando:
- Links son bidireccionales
- Terminología es consistente
- Reviewer entiende el flujo navegando entre docs

---

## ⏰ DÍA 3–4: PR-2 (Validators B1–B3)

### Tarea
Implementar 3 validadores fail-hard + tests. Plugearlos en appendEvent.

### Qué Hacer (Específico)

**Día 3: Crear el archivo + Validadores**

1. **Crear archivo** `supabase/functions/_shared/eventValidator.ts`:
   ```typescript
   export function validateRequiredEvidenceNotNull(event: DocumentEvent): void {
     if (event.type !== 'document.protected.requested') return;

     const re = event.payload.required_evidence;
     if (!re || !Array.isArray(re) || re.length === 0) {
       throw new ValidationError('B1: required_evidence must be non-empty array', {
         event_id: event.id,
         provided: re
       });
     }
   }

   export function validateMonotonicityByStage(
     newEvent: DocumentEvent,
     prevEvents: DocumentEvent[]
   ): void {
     if (newEvent.type !== 'document.protected.requested') return;

     const prevEvent = prevEvents
       .filter(e => e.type === 'document.protected.requested')
       .pop();

     if (!prevEvent) return;

     const prevStage = prevEvent.payload.anchor_stage || 'initial';
     const newStage = newEvent.payload.anchor_stage || 'initial';
     const prev = prevEvent.payload.required_evidence || [];
     const next = newEvent.payload.required_evidence || [];

     if (prevStage === newStage && !arraysEqual(prev, next)) {
       throw new ValidationError(
         'B2: required_evidence cannot change within same stage',
         { stage: newStage, prev, next }
       );
     }

     if (stageOrder(prevStage) < stageOrder(newStage) && !isSubset(prev, next)) {
       throw new ValidationError(
         'B2: required_evidence can only grow between stages',
         { from: prevStage, to: newStage, prev, next }
       );
     }

     if (stageOrder(prevStage) > stageOrder(newStage)) {
       throw new ValidationError(
         'B2: anchor_stage cannot go backwards',
         { from: prevStage, to: newStage }
       );
     }
   }

   export function validateMinimumEvidence(event: DocumentEvent): void {
     if (event.type !== 'document.protected.requested') return;

     const { required_evidence, policy_override } = event.payload;

     if (!required_evidence?.includes('tsa')) {
       if (policy_override === 'special_case') {
         console.warn('[B3-OVERRIDE]', { doc_id: event.document_entity_id });
         return;
       }

       throw new ValidationError(
         'B3: required_evidence must include "tsa" as minimum',
         { required_evidence, policy_override }
       );
     }
   }

   // Helpers
   function arraysEqual(a: string[], b: string[]): boolean {
     return a.length === b.length && a.every((x, i) => x === b[i]);
   }

   function isSubset(sub: string[], sup: string[]): boolean {
     return sub.every(x => sup.includes(x));
   }

   function stageOrder(s: string): number {
     return { initial: 0, intermediate: 1, final: 2 }[s] ?? -1;
   }
   ```

2. **Verificar que el archivo compila**:
   ```bash
   npx tsc supabase/functions/_shared/eventValidator.ts --noEmit
   ```

**Día 4: Tests + Integration**

1. **Crear tests** `tests/validators/b1_b2_b3.test.ts`:
   ```typescript
   import {
     validateRequiredEvidenceNotNull,
     validateMonotonicityByStage,
     validateMinimumEvidence,
     ValidationError
   } from '...eventValidator';

   describe('Validator B1: No-Null', () => {
     test('Rechaza required_evidence null', () => {
       const event = {
         type: 'document.protected.requested',
         payload: { required_evidence: null }
       };
       expect(() => validateRequiredEvidenceNotNull(event))
         .toThrow('B1');
     });

     test('Rechaza required_evidence vacío', () => {
       const event = {
         type: 'document.protected.requested',
         payload: { required_evidence: [] }
       };
       expect(() => validateRequiredEvidenceNotNull(event))
         .toThrow('B1');
     });

     test('Acepta array válido', () => {
       const event = {
         type: 'document.protected.requested',
         payload: { required_evidence: ['tsa'] }
       };
       expect(() => validateRequiredEvidenceNotNull(event))
         .not.toThrow();
     });
   });

   describe('Validator B2: Monotonicity', () => {
     test('Permite crecer entre etapas', () => {
       const prev = {
         type: 'document.protected.requested',
         payload: { anchor_stage: 'initial', required_evidence: ['tsa', 'polygon'] }
       };
       const next = {
         type: 'document.protected.requested',
         payload: { anchor_stage: 'intermediate', required_evidence: ['tsa', 'polygon', 'bitcoin'] }
       };
       expect(() => validateMonotonicityByStage(next, [prev]))
         .not.toThrow();
     });

     test('Rechaza disminuir entre etapas', () => {
       const prev = {
         type: 'document.protected.requested',
         payload: { anchor_stage: 'initial', required_evidence: ['tsa', 'polygon'] }
       };
       const next = {
         type: 'document.protected.requested',
         payload: { anchor_stage: 'intermediate', required_evidence: ['tsa'] }
       };
       expect(() => validateMonotonicityByStage(next, [prev]))
         .toThrow('B2');
     });

     test('Rechaza cambio dentro de misma etapa', () => {
       const prev = {
         type: 'document.protected.requested',
         payload: { anchor_stage: 'initial', required_evidence: ['tsa'] }
       };
       const next = {
         type: 'document.protected.requested',
         payload: { anchor_stage: 'initial', required_evidence: ['tsa', 'polygon'] }
       };
       expect(() => validateMonotonicityByStage(next, [prev]))
         .toThrow('B2');
     });
   });

   describe('Validator B3: TSA Minimum', () => {
     test('Requiere "tsa"', () => {
       const event = {
         type: 'document.protected.requested',
         payload: { required_evidence: ['tsa', 'polygon'] }
       };
       expect(() => validateMinimumEvidence(event))
         .not.toThrow();
     });

     test('Rechaza sin "tsa"', () => {
       const event = {
         type: 'document.protected.requested',
         payload: { required_evidence: ['polygon', 'bitcoin'] }
       };
       expect(() => validateMinimumEvidence(event))
         .toThrow('B3');
     });

     test('Permite override con policy_override=special_case', () => {
       const event = {
         type: 'document.protected.requested',
         payload: {
           required_evidence: ['polygon'],
           policy_override: 'special_case'
         }
       };
       expect(() => validateMinimumEvidence(event))
         .not.toThrow();
     });
   });
   ```

2. **Plugear en appendEvent** (encuentra el archivo donde se validan eventos):
   ```typescript
   // Donde hoy se hace INSERT a document_entities.events

   export async function appendEvent(
     event: DocumentEvent,
     documentEntity: DocumentEntity
   ): Promise<void> {
     // Validar ANTES de insertar
     validateRequiredEvidenceNotNull(event);          // B1
     validateMonotonicityByStage(event, documentEntity.events);  // B2
     validateMinimumEvidence(event);                  // B3

     // Si pasó todos, insertar
     const { data, error } = await supabase
       .from('document_entities')
       .update({ events: [...documentEntity.events, event] })
       .eq('id', documentEntity.id);

     if (error) throw error;
   }
   ```

3. **Correr tests**:
   ```bash
   npm test -- b1_b2_b3.test.ts
   ```
   Debe pasar 100%.

### Acceptance Criteria
- [ ] `eventValidator.ts` existe con 3 funciones
- [ ] Cada función lanza `ValidationError` con contexto específico
- [ ] Tests existen (mínimo 3 por validador)
- [ ] Todos los tests pasan
- [ ] Validadores se llaman en `appendEvent` ANTES de persistir
- [ ] Si borras un validador, al menos 1 test falla
- [ ] Validadores NO pueden ser bypasseados sin código

### Micro-Validación (Pedile Al Dev)
```
"Enviame el archivo eventValidator.ts + tests. Voy a verificar:
1. npm test pasa 100%
2. Si borro un validador, fallan tests
3. Validadores se llaman en appendEvent"
```

### Merge Criteria
PR-2 se mergea cuando:
- Tests pasan 100%
- Validadores son fail-hard (throw, no warn)
- No hay forma de bypassear los validadores

---

## ⏰ DÍA 5–6: PR-3 (Observability + Compat)

### Tarea
Agregar `enqueue_source` column, marcar trigger y 4 direct inserts.

### Qué Hacer (Específico)

**Día 5: Migration + Trigger**

1. **Crear migration** `supabase/migrations/20260220180000_add_enqueue_source_to_executor_jobs.sql`:
   ```sql
   BEGIN;

   ALTER TABLE executor_jobs
   ADD COLUMN enqueue_source TEXT DEFAULT 'unknown'
     CHECK (enqueue_source IN ('canonical', 'compat_direct', 'manual'));

   CREATE INDEX idx_executor_jobs_enqueue_source
   ON executor_jobs(enqueue_source, created_at DESC);

   UPDATE executor_jobs SET enqueue_source = 'canonical'
   WHERE status IN ('succeeded', 'completed', 'running')
     AND dedupe_key IS NOT NULL
     AND correlation_id IS NOT NULL
     AND created_at > NOW() - INTERVAL '7 days';

   COMMIT;
   ```

2. **Actualizar trigger** `process_document_entity_events()`:

   Buscar TODOS los INSERT en esa función. Agregar `enqueue_source = 'canonical'`:
   ```sql
   -- ANTES:
   INSERT INTO executor_jobs (correlation_id, type, status, dedupe_key, payload)
   VALUES (new.id, 'protect_document_v2', 'pending', ..., ...);

   -- DESPUÉS:
   INSERT INTO executor_jobs (correlation_id, type, status, dedupe_key, payload, enqueue_source)
   VALUES (new.id, 'protect_document_v2', 'pending', ..., ..., 'canonical');
   ```

   **Líneas aproximadas donde buscar** (según audit):
   - protect_document_v2 (varios lugares en trigger)
   - run_tsa (si está en trigger)
   - submit_anchor_polygon
   - submit_anchor_bitcoin
   - build_artifact
   - etc.

   **Regla**: TODOS los INSERT en el trigger deben tener `enqueue_source = 'canonical'`

3. **Verificar que migration compila**:
   ```bash
   # En staging, correr la migration
   npx supabase migration list
   ```

**Día 6: Direct Inserts + Tests**

1. **Actualizar 4 direct inserts**:

   **Archivo 1**: `supabase/functions/record-protection-event/index.ts` (línea ~222)
   ```typescript
   // ANTES:
   const { data: job } = await supabase
     .from('executor_jobs')
     .insert({
       correlation_id: documentEntityId,
       type: 'protect_document_v2',
       ...
     });

   // DESPUÉS:
   const { data: job } = await supabase
     .from('executor_jobs')
     .insert({
       correlation_id: documentEntityId,
       type: 'protect_document_v2',
       enqueue_source: 'compat_direct',  // ← ADD THIS
       ...
     });
   ```

   Repetir en:
   - `apply-signer-signature/index.ts` línea ~1284 (run_tsa)
   - `apply-signer-signature/index.ts` línea ~1649 (protect_document_v2)
   - `run-tsa/index.ts` línea ~226 (generate_signature_evidence)

   **Checklist**:
   - [ ] record-protection-event: enqueue_source = 'compat_direct'
   - [ ] apply-signer-signature (run_tsa): enqueue_source = 'compat_direct'
   - [ ] apply-signer-signature (protect_v2): enqueue_source = 'compat_direct'
   - [ ] run-tsa: enqueue_source = 'compat_direct'

2. **Crear tests**:
   ```typescript
   // tests/observability/enqueue_source.test.ts

   test('Trigger enqueues with enqueue_source=canonical', async () => {
     // Setup: create event that triggers job enqueue
     const event = {
       type: 'document.protected.requested',
       payload: { required_evidence: ['tsa'] }
     };

     await appendEvent(event, doc);

     // Trigger should fire and enqueue job
     await wait(1000);

     const job = await getJob(doc.id, 'protect_document_v2');
     expect(job.enqueue_source).toBe('canonical');
   });

   test('Direct insert enqueues with enqueue_source=compat_direct', async () => {
     // Call API that does direct insert
     await callRecordProtectionEvent(doc);

     const job = await getJob(doc.id, 'protect_document_v2');
     expect(job.enqueue_source).toBe('compat_direct');
   });

   test('Health query shows distribution', async () => {
     const result = await supabase.rpc('get_enqueue_source_metrics', {
       hours: 24
     });

     expect(result.data).toContainEqual(
       expect.objectContaining({ enqueue_source: 'canonical' })
     );
     expect(result.data).toContainEqual(
       expect.objectContaining({ enqueue_source: 'compat_direct' })
     );
   });
   ```

3. **Crear health check query** (SQL):
   ```sql
   -- Guardar como: docs/ops/health-check-query.sql

   SELECT
     enqueue_source,
     COUNT(*) as count,
     ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage,
     DATE_TRUNC('hour', created_at) as hour
   FROM executor_jobs
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY enqueue_source, DATE_TRUNC('hour', created_at)
   ORDER BY hour DESC, enqueue_source;
   ```

### Acceptance Criteria
- [ ] Migration crea `enqueue_source` column con constraint
- [ ] Trigger setea `enqueue_source = 'canonical'` en TODOS los INSERT
- [ ] 4 direct inserts setean `enqueue_source = 'compat_direct'`
- [ ] Tests pasan
- [ ] Health query funciona (devuelve % distribution)
- [ ] Constraint rechaza valores inválidos (test)

### Micro-Validación (Pedile Al Dev)
```
"Enviame:
1. Migration file (verifico que constraint está)
2. Trigger actualizado (verifico que TODOS los INSERT tienen enqueue_source='canonical')
3. Los 4 direct inserts actualizados (verifico que tienen enqueue_source='compat_direct')
4. Health query (lo corro en staging)

Responde: ¿Cuántos jobs hay con canonical vs compat_direct en últimas 24h en staging?"
```

### Merge Criteria
PR-3 se mergea cuando:
- Migration deploya sin errores
- Trigger tiene `enqueue_source = 'canonical'` en TODOS los INSERT
- 4 direct inserts tienen `enqueue_source = 'compat_direct'`
- Health query muestra > 90% canonical (listener está healthy)

---

## ⏰ DÍA 7: Buffer + Final Checks

### Tareas
1. Responder reviews en los 3 PRs
2. Verificar que no hay regressions en E2E existentes
3. Final docs/comments en el código
4. Merge cuando todo esté limpio

### Qué Verificar
```
[ ] Todos los tests pasan (npm test)
[ ] No hay linting errors (npm run lint)
[ ] Staging deployment fue clean
[ ] Health query en staging muestra > 90% canonical
[ ] No regressions en E2E tests existentes
```

---

## 📊 Daily Check-In (Cada Fin De Día)

**Preguntale al dev al cierre de cada día**:

### Día 1–2 (PR-1)
```
"¿Están los 3 documentos linkeados? ¿Los links funcionan?"
Esperado: Sí a ambas.
```

### Día 3–4 (PR-2)
```
"¿Corren los tests? ¿Todos pasan?"
"¿Si borro un validador, falla algo?"
Esperado: Sí a ambas.
```

### Día 5–6 (PR-3)
```
"¿La migration deployó sin errores?"
"¿El health query muestra >90% canonical?"
"¿Los 4 direct inserts tienen compat_direct?"
Esperado: Sí a todo.
```

### Día 7
```
"¿Todos los tests pasan? ¿Alguna regresión?"
Esperado: No regressions.
```

---

## 🚨 Red Flags (Stop Dev, Fix Immediately)

```
❌ "Validadores loguean warning pero no throw"
   → STOP. Deben ser fail-hard.

❌ "Solo 2 de 4 direct inserts tienen compat_direct"
   → STOP. Todos 4 deben actualizarse.

❌ "Tests pasan pero no testean lo que me importa"
   → STOP. Preguntale: "¿Si borro el validador, falla?"

❌ "Health query muestra <80% canonical"
   → WARNING. Investigar por qué listener está degraded.

❌ "Trigger tiene enqueue_source en solo 50% de los INSERT"
   → STOP. Debe ser 100%.
```

---

## ✅ Merge Gate (Antes De Mergear)

**PR-1**:
- [ ] Cross-refs bidireccionales ✓
- [ ] Terminología consistente ✓

**PR-2**:
- [ ] Tests 100% ✓
- [ ] Validadores fail-hard ✓
- [ ] Llamados en appendEvent ✓

**PR-3**:
- [ ] Migration deployó ✓
- [ ] Trigger 100% completo ✓
- [ ] 4 direct inserts completos ✓
- [ ] Health >90% canonical ✓

---

## Timeline Visual

```
Lun  Tue  Wed  Thu  Fri  Sat
PR-1: ██████
       PR-2: ██████
            PR-3: ██████
                  Buffer: ██
```

Total: 7 días (con buffer).

---

**Owner**: [Tú]
**Dev**: [Asignado]
**Status**: Ready to kickoff

