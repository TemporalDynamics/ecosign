# Direct Inserts: Compat Failover (NO Autoridad Paralela)
## Por Qué 4 Entrypoints, Por Qué Existen, Cuándo Removerlos

**Versión**: 1.0
**Estado**: Normativa + Roadmap de Remediación
**Efectividad**: 2026-02-20
**Audiencia**: Engineering, Architecture

---

## 1. Tesis: NO Son Autoridad Paralela

```
FALSO:
  "Hay trigger canónico + 4 direct inserts = dos autoridades"

VERDAD:
  Hay UNA autoridad única: trigger canónico.
  Los 4 direct inserts son COMPAT FALLBACK (defensa en profundidad).
```

### Definición de Autoridad

**Autoridad única = protectDocumentV2PipelineDecision()**

La autoridad única (trigger canónico) es formalizada en
[MODELO_B_POLICY_EVOLUTION.md](./MODELO_B_POLICY_EVOLUTION.md) § 1.

```
Responsabilidad:
  - Lee events[] actuales
  - Evalúa qué falta (TSA, Polygon, Bitcoin, artifact, etc.)
  - Decide qué encolar y cuándo
  - Emite decisión determinística

Ubicación:
  - SQL: process_document_entity_events() trigger
  - Lógica: protectDocumentV2PipelineDecision.ts

Principio:
  "Estado actual (events[]) → Decisión sobre siguiente paso"
  Sin excepciones, sin shortcuts.
```

### Por Qué Faltan Direct Inserts Entonces

**Respuesta histórica**:
```
Fase 1: Listener trigger se implementó (2026-02-15)
Fase 2: Direct inserts ya existían desde antes
Fase 3: No se removieron porque:
  a) Listener es NUEVO, podría tener bugs
  b) Si listener falla, procesos quedan orphaned
  c) Direct inserts son "compat fallback"
```

**Status Actual**:
```
Listener es ESTABLE pero NO 100% de cobertura comprobada
Direct inserts son NECESARIOS como emergencia backup
Pero deben ser MONITOREADOS, no normales
```

Terminología contractual: esto es **compat failover** (ruta de respaldo),
no autoridad paralela.

---

## 2. Los 4 Entrypoints (Allowlist Exhaustivo)

### Tabla Completa

| # | Función | Línea | Job Type | Etapa | Correlación | Deduplicación |
|---|---------|-------|----------|-------|-------------|---------------|
| 1 | `record-protection-event/index.ts` | 222-244 | `protect_document_v2` | Usuario inicia protección | correlation_id = doc_id | dedupe_key = hash(policy_version) |
| 2 | `apply-signer-signature/index.ts` | 1284-1303 | `run_tsa` | Firmante firma, se requiere TSA nuevo | correlation_id = doc_id | dedupe_key = hash(flow_id, attempt) |
| 3 | `apply-signer-signature/index.ts` | 1649-1671 | `protect_document_v2` | Firma final, revalidar protección | correlation_id = doc_id | dedupe_key = hash(step_index) |
| 4 | `run-tsa/index.ts` | 226-241 | `generate_signature_evidence` | TSA confirmado, generar evidence | correlation_id = doc_id | dedupe_key = hash(tsa_txid) |

### Por Qué Cada Una Existe

#### #1: record-protection-event (Línea 222)
```
Caso: Usuario hace POST /protect (inicia flujo)
Flujo: Síncrono desde API

Sin direct insert:
  Trigger puede tardar segundos en disparar
  Usuario ve "Processing..." sin saber si encoló

Con direct insert:
  Encolamos JOB inmediatamente
  UI sabe que job existe
  Si trigger luego falla, el job ya existe

Status: CRÍTICO mantener
  → Usuarios dependen de feedback inmediato
  → Es el point of entry del sistema
```

#### #2 & #3: apply-signer-signature (Líneas 1284, 1649)
```
Caso a (1284): Firmante firma → necesitamos TSA NUEVO
  Por qué: Cada firmante quiere su propio timestamp
  Sin direct insert:
    - Evento signature.applied dispara trigger
    - Trigger calcula "necesitas TSA nuevo"
    - Encola run_tsa job
    - Pero hay lag
  Con direct insert:
    - Dentro de apply-signer-signature ya sabemos
    - Encolamos TSA job INMEDIATAMENTE
    - Trigger lo ve y deduplica (dedupe_key)

Caso b (1649): Firma final → revalidar protección
  Por qué: Última firma podría cambiar required_evidence
  Sin direct insert:
    - Evento signature.applied dispara
    - Trigger reevalúa
    - Lag en reencolado de protect_document_v2
  Con direct insert:
    - Sabemos en apply-signer-signature que es final
    - Encolamos protect_document_v2 INMEDIATAMENTE
    - Trigger deduplica

Status: COMPAT MODE necesario
  → Firmware complex, múltiples condiciones
  → Listener aún no tiene 100% cobertura de esos casos
```

#### #4: run-tsa (Línea 226)
```
Caso: TSA confirmado → generar evidence (artifact)
Flujo: Asincrónico, ejecutor ya está procesando

Sin direct insert:
  Evento tsa.confirmed dispara trigger
  Trigger encolada build_artifact / generate_signature_evidence
  Lag de segundos

Con direct insert:
  run-tsa executor ya sabe que confirmó
  Encola evidence generation INMEDIATAMENTE
  No espera trigger

Status: OPTIMIZACIÓN / ACCELERATION
  → Podría removerse si listener es fast enough
```

---

## 3. Diferencia Crítica: "Enqueue Source"

### Concepto: Dónde Vino El Job

**Canonical (lo que queremos)**:
```
Ruta: evento en events[] → trigger SQL → INSERT executor_jobs
Fuente: única verdad (events[])
Identificador: enqueue_source = 'canonical'
```

**Compat Direct (lo que toleramos)**:
```
Ruta: Edge Function → INSERT executor_jobs (directo)
Fuente: lateral, fuera del event stream
Identificador: enqueue_source = 'compat_direct'
```

### Cómo Se Diferencia Hoy

**Problema**: NO hay forma de saber cuál fue la fuente.

**Solución** (RECOMENDACIÓN CRÍTICA):

Agregar campo a `executor_jobs`:
```sql
ALTER TABLE executor_jobs ADD COLUMN enqueue_source TEXT
  DEFAULT 'unknown'
  CHECK (enqueue_source IN ('canonical', 'compat_direct', 'manual'));

-- En trigger SQL:
INSERT INTO executor_jobs (..., enqueue_source)
VALUES (..., 'canonical');

-- En cada direct insert (Edge Function):
INSERT INTO executor_jobs (..., enqueue_source)
VALUES (..., 'compat_direct');
```

### Métrica: % Canonical vs % Compat_Direct

Una vez que `enqueue_source` existe, agregar observabilidad:

```sql
-- Query de salud del sistema
SELECT
  enqueue_source,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as pct,
  DATE_TRUNC('hour', created_at) as hour
FROM executor_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY enqueue_source, DATE_TRUNC('hour', created_at)
ORDER BY hour DESC, enqueue_source;

-- Resultado esperado (SALUDABLE):
hour                  enqueue_source  count  pct
2026-02-20 15:00 UTC  canonical       148    94.3%
2026-02-20 15:00 UTC  compat_direct   9      5.7%

-- Resultado ALARMANTE:
hour                  enqueue_source  count  pct
2026-02-20 15:00 UTC  canonical       15     23.4%  ← Trigger down
2026-02-20 15:00 UTC  compat_direct   49     76.6%  ← Compat carrying load
```

---

## 4. Cómo Deduplicación Previene Duplicados

### El Problema

Sin deduplicación:
```
1. Direct insert encolada job X
2. Trigger SQL TAMBIÉN encolada job X
3. Job X se ejecuta TWICE
4. Error: double-anchoring, duplicate signatures
```

### La Solución: Dedupe_Key

```sql
-- El secret sauce está en UNIQUE constraint
CREATE UNIQUE INDEX idx_executor_jobs_dedupe ON executor_jobs(
  correlation_id,   -- documento
  type,             -- qué tipo de job
  dedupe_key        -- identificador único de "esta cosa específica"
) WHERE status IN ('pending', 'running');

-- En trigger SQL:
INSERT INTO executor_jobs (correlation_id, type, dedupe_key, ...)
VALUES (doc_id, 'run_tsa', CONCAT('tsa_', current_attempt))
ON CONFLICT DO NOTHING;  -- Si ya existe, ignora

-- En direct insert (edge function):
INSERT INTO executor_jobs (correlation_id, type, dedupe_key, ...)
VALUES (doc_id, 'run_tsa', CONCAT('tsa_', current_attempt))
ON CONFLICT DO NOTHING;  -- Si trigger ya encoló, ignora esta
```

### Resultado

```
Timeline:

T_1.0: apply-signer-signature direct insert
       INSERT executor_jobs (correlation_id='doc123', type='run_tsa', dedupe_key='tsa_1')
       → Inserta OK

T_1.5: Trigger dispara (signature.applied evento)
       INSERT executor_jobs (correlation_id='doc123', type='run_tsa', dedupe_key='tsa_1')
       → CONFLICT: dedupe_key ya existe
       → ON CONFLICT DO NOTHING
       → Ignora (no duplica)

Resultado: 1 job, no 2
```

---

## 5. La Defensa Arquitectónica: Por Qué No Es Malo

### Principio: Defense in Depth

```
ESCENARIO 1: Listener SANO
  event → trigger DISPARA → job se encola
  direct insert ve que job ya existe (dedupe) → ignora
  Resultado: UNA fuente de verdad, dos capas de redundancia

ESCENARIO 2: Listener FALLÓ (bug temporal)
  event → trigger FALLA silenciosamente
  direct insert ENCOLA el job
  Resultado: Fallover gracioso, usuario NO está impactado

ESCENARIO 3: Listener DEGRADADO (lag de 10s)
  event → trigger ENCOLA (con lag)
  direct insert ENCOLA también (inmediato)
  Dedupe impide duplicado
  Resultado: Job se procesa inmediatamente (via direct), trigger es ignorado
```

### El "No" Negociable

```
NO es aceptable:
  "Quitemos direct inserts porque 'es más limpio'"
  → Sin fallover, si listener falla, users are stuck

SÍ es aceptable:
  "Mantenemos direct inserts como compat, monitoreamos enqueue_source,
   y los removemos cuando listener sea 99.99% confiable"
```

---

## 6. Plan de Remediación: Cuándo Remover Direct Inserts

### Fase Actual: "Compat Mode" (2026-02-20)
```
Estado: Live + Monitored
Criterios:
  ✓ 4 direct inserts existente (en allowlist)
  ✓ Deduplicación funciona (dedupe_key previene duplicados)
  ✓ Listener está estable pero no probado 100%

Acción: AGREGAR enqueue_source + métricas
```

### Fase 1: "Monitoreo Completo" (2-3 semanas)
```
Criterio de readiness:
  - enqueue_source existe en schema
  - Métricas muestran % canonical vs compat_direct diario
  - Tests E2E "sin direct inserts" pasan
  - Listener ha estado verde 7 días + 99%+ canonical

Entrega:
  - Dashboard mostrando enqueue_source %
  - Alert si compat_direct > 10% (listener degradado)
  - Test coverage: 3 nuevos tests E2E
```

### Fase 2: "Feature Flags" (1 semana)
```
Implementar kill-switch por entrypoint:

feature_flags table:
  allow_direct_insert_record_protection = true
  allow_direct_insert_apply_signer_tsa = true
  allow_direct_insert_apply_signer_protect = true
  allow_direct_insert_run_tsa_evidence = true

Uso:
  Antes de INSERT, checkear flag:
  IF NOT get_feature_flag('allow_direct_insert_record_protection') THEN
    RAISE error "Direct insert disabled, use canonical path"

Ventaja: Disable/enable SIN code deploy
```

### Fase 3: "Gradual Rolldown" (2-4 semanas)
```
Para cada entrypoint, EN ORDEN:

1. Set feature flag to FALSE (1 entrypoint)
2. Monitor logs (alguien intenta usar? CATCH en try/catch)
3. Wait 3-5 días
4. If no errors → remove direct INSERT code
5. Repeat para siguiente entrypoint

ORDER (del menos crítico al más crítico):
  a) run-tsa (Line 226) - optimización, menos crítico
  b) apply-signer-signature protect (Line 1649) - compat, removible
  c) apply-signer-signature tsa (Line 1284) - compat, removible
  d) record-protection-event (Line 222) - CRÍTICO ÚLTIMO
```

### Fase 4: "Postcondition Check" (ongoing)
```
Después de remover cada entrypoint, query para verificar no hay fallos:

SELECT COUNT(*) FROM executor_jobs
WHERE enqueue_source = 'compat_direct'
  AND type = 'protect_document_v2'
  AND status IN ('failed', 'retry_scheduled')
  AND created_at > NOW() - INTERVAL '24 hours';

If count > 0: REVERT, investigar por qué listener no encoló
If count == 0 for 7 days: Safe to keep it removed
```

---

## 7. No Hay Roadmap de "Remove All Direct Inserts Immediately"

### Por Qué No

```
Si hiciéramos:
  "Direct inserts removed. Canonical trigger is God."

Y luego:
  Trigger tiene bug
  Descubrimos a las 3 AM con clientes impactados
  No hay fallback
  Crisis

En cambio, tenemos:
  Trigger sano + direct inserts como compat
  Si trigger falla, directo los compensa
  Users NO notan

Eso es NOT "technical debt", es "intelligent redundancy".
```

### Verdadero Plan

```
Goal: Listener trigger es 99.99% confiable
Mantener: Direct inserts como compat (bajo flag)
Timeline: Post-stabilidad (meses, no días)

No es "quitar", es "degradar a fallback".
```

---

## 8. Invariante: Autoridad SIGUE Siendo Única

Aunque tengamos 4 direct inserts:

```
protectDocumentV2PipelineDecision() es la ÚNICA autoridad
porque:

1. Decide QUÉ se encola (no los direct inserts)
2. Decide CUÁNDO (no los direct inserts)
3. Validación de B1–B3 (reglas Modelo B)
4. Deduplicación impide parallelismo

Los 4 direct inserts:
- Solo encolan jobs
- Trigger deduplica
- No contradicen la autoridad
- Son transport / optimization
```

---

## 9. Cómo Testear Que TODO Funciona Sin Direct Inserts

### Test E2E: "Canonical Only"

```typescript
describe('E2E: Canonical Path (No Direct Inserts)', () => {

  // Setup: desactivar todos los flags
  beforeAll(async () => {
    await disableAllDirectInsertFlags();
  });

  test('1. Record protection event → listener encolada job', async () => {
    const doc = await createDocument();
    const protectionRequest = await callRecordProtectionEvent(doc);

    // Verificar que job EXISTE en executor_jobs
    const job = await getJobForDocument(doc.id, 'protect_document_v2');
    expect(job).toBeDefined();
    expect(job.enqueue_source).toBe('canonical');  // No 'compat_direct'
  });

  test('2. Apply signature → listener encolada TSA job', async () => {
    const doc = await createDocumentWithSignature();

    // Trigger debe haber encolada run_tsa
    const tsa_job = await getJobForDocument(doc.id, 'run_tsa');
    expect(tsa_job).toBeDefined();
    expect(tsa_job.enqueue_source).toBe('canonical');
  });

  test('3. TSA confirmed → listener encolada evidence job', async () => {
    const doc = await completeSignatureFlow();

    // Trigger debe haber encolada generate_signature_evidence
    const evidence_job = await getJobForDocument(doc.id, 'generate_signature_evidence');
    expect(evidence_job).toBeDefined();
    expect(evidence_job.enqueue_source).toBe('canonical');
  });

  test('4. Full flow without direct inserts', async () => {
    const flow = await startFullSignatureFlow(5); // 5 signers

    // Ejecutar
    await executeAllJobs();

    // Verificar resultado
    const doc = await getDocument(flow.doc_id);
    expect(doc.overall_status).toBe('certified');
    expect(doc.signature_count).toBe(5);

    // Verificar NO hay compat_direct jobs en este documento
    const compat_jobs = await getJobsForDocument(flow.doc_id, 'compat_direct');
    expect(compat_jobs).toHaveLength(0);
  });
});
```

---

## 10. Resumen Ejecutivo

### Lo Que El Dev Tiene Que Hacer YA

```
CRÍTICO (Bloquea migración):
[ ] Agregar campo enqueue_source a executor_jobs (migration)
[ ] En trigger SQL: fijear enqueue_source = 'canonical'
[ ] En cada direct insert: fijar enqueue_source = 'compat_direct'
[ ] Crear test E2E "canonical-only" ✓ template arriba
[ ] Agregar alerta si compat_direct > 10% en 24h
```

### Lo Que El Dev PUEDE Hacer Después

```
IMPORTANTE (Roadmap post-estabilidad):
[ ] Implementar feature flags (por entrypoint)
[ ] Gradual rolldown (Fase 3, 2-4 semanas)
[ ] Monitor post-rolldown (Fase 4)
```

### Lo Que El Dev NO Debe Hacer

```
NO:
[ ] Remover direct inserts sin feature flag
[ ] Depender de listener 100% (sin fallover)
[ ] Dejar enqueue_source missing (no hay observabilidad)
[ ] Decir "es autoridad paralela" (NO: es compat fallover)
```

---

## 11. Frase Final

```
"Direct inserts no son autoridad paralela.
Son defensa en profundidad.

El trigger canónico es el árbitro único.
Los direct inserts son su fallover silencioso.

Cuando el listener sea 99.99% confiable,
los direct inserts se convertirán en puro compat (bajo feature flag).

Pero hasta ese día, son necesarios.
No es deuda técnica, es redundancia inteligente."
```

---

**Aprobación**: Este documento es normativa + roadmap.
**Efectivo**: 2026-02-20
**Responsable**: Engineering Lead
