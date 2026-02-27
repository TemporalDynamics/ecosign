# CONTRATO_ESTADOS_EVENTOS_ANCHORING_POR_DOCUMENTO

Fecha: 2026-02-26
Estado: Canonical
Version: v1.0

## Objetivo
Congelar la referencia operativa real para:

1. Tabla de estados posibles.
2. Eventos validos por estado.
3. Transicion que dispara anchoring.
4. Correlacion canonica por documento.

Este documento evita mezclar capas de estado (persistida, pipeline y derivada de UI).

## Alcance
- Entidad: `document_entities`.
- Ledger canonico: `document_entities.events[]` (append-only).
- Pipeline: `protect_document_v2` + workers `run-tsa`, `submit-anchor-*`, `process-*-anchors`, `build-artifact`.

## Capa A - Estados persistidos reales (`lifecycle_status`)

Fuente: `supabase/migrations/20260106090000_document_entities.sql`

| Estado persistido | Significado operativo |
| --- | --- |
| `protected` | Documento protegido en lifecycle canonico. |
| `needs_witness` | Requiere witness o evidencia inicial para continuar. |
| `witness_ready` | Witness listo para pasos probatorios siguientes. |
| `in_signature_flow` | Documento en flujo de firma activo. |
| `signed` | Firma completada. |
| `anchored` | Evidencia de anclaje confirmada (derivada de eventos). |
| `revoked` | Documento revocado. |
| `archived` | Documento archivado. |

Nota: estos estados no reemplazan la verdad de eventos. La fuente de verdad probatoria sigue siendo `events[]`.

## Capa B - Estados de pipeline (internos al listener/executor)

Fuente: `supabase/migrations/20260224163000_canonicalize_listener_dedupe_and_signature_evidence.sql`

| Estado pipeline | Evento que lo abre | Evento/s que lo cierran |
| --- | --- | --- |
| `awaiting_tsa` | `document.protected.requested` | `tsa.confirmed` |
| `awaiting_anchors` | `tsa.confirmed` | `anchor.confirmed` o `rekor.confirmed` |
| `awaiting_artifact` | `anchor.confirmed` o `rekor.confirmed` | `artifact.finalized` |

Nota: `awaiting_*` se usa para dedupe/enqueue de jobs. No es columna de estado persistida.

## Eventos validos por estado de pipeline

### 1) `awaiting_tsa`
- Evento de entrada requerido:
  - `document.protected.requested` con `payload.required_evidence` (array no vacio).
- Eventos operativos validos:
  - `job.run-tsa.required`
  - `tsa.confirmed`
  - `tsa.failed`
- Guardrails:
  - `tsa.confirmed` requiere request previo (`document.protected.requested`).
  - `tsa.confirmed` debe tener `_source='run-tsa'`.

### 2) `awaiting_anchors`
- Evento de entrada requerido:
  - `tsa.confirmed` para el `witness_hash` de trabajo.
- Eventos operativos validos:
  - `job.submit-anchor-polygon.required` (si `required_evidence` incluye `polygon` y no esta confirmado).
  - `job.submit-anchor-bitcoin.required` (si `required_evidence` incluye `bitcoin` y no esta confirmado).
  - `anchor.submitted`
  - `anchor.confirmed`
  - `anchor.timeout`
  - `anchor.failed`
- Guardrails:
  - `submit-anchor-*` rechaza con `precondition_failed:missing_tsa_for_witness_hash` si no existe TSA para ese `witness_hash`.
  - `anchor.timeout` es terminal para el intento en curso y debe incluir red + witness + intento + limite.
  - `anchor.failed` puede representar error terminal no-timeout o timeout (`failure_code='timeout'`).

### 3) `awaiting_artifact`
- Evento de entrada requerido:
  - `anchor.confirmed` o `rekor.confirmed`.
- Eventos operativos validos:
  - `job.build-artifact.required`
  - `artifact.finalized`
  - `artifact.failed`
- Guardrails:
  - `artifact.finalized` es unico por documento (no duplicable).

## Transicion exacta que dispara anchoring

Regla canonica del decision engine:

1. Existe `tsa.confirmed`.
2. En el ultimo `document.protected.requested`, `required_evidence` incluye la red (`polygon` y/o `bitcoin`).
3. No existe `anchor.confirmed` para la red solicitada.

Cuando se cumplen 1+2+3:
- Se decide job `submit_anchor_polygon` y/o `submit_anchor_bitcoin`.
- El executor emite `job.submit-anchor-polygon.required` y/o `job.submit-anchor-bitcoin.required`.

## Estados terminales de anchoring por red

Para cada red solicitada (`polygon`, `bitcoin`), el intento activo termina en uno de estos eventos:

1. `anchor.confirmed`: confirmacion probatoria valida en cadena.
2. `anchor.timeout`: timeout determinista del worker (sin confirmacion dentro de la ventana definida).
3. `anchor.failed`: error terminal del provider o validacion (por ejemplo `missing_tx_hash`, `max_attempts`).

Regla operativa: no debe existir estado "solicitado infinito" una vez que el worker procesa el intento y supera su ventana/limite.

Fuente principal:
- `supabase/functions/_shared/decisionEngineCanonical.ts`
- `supabase/functions/_shared/protectDocumentV2PipelineDecision.ts`
- `supabase/functions/fase1-executor/index.ts`

## Correlacion por documento (confirmada)

Invariante canonica actual: **una traza por documento**.

Reglas efectivas:
1. `appendEvent(...)` fuerza:
   - `entity_id = document_entity_id`
   - `correlation_id = document_entity_id`
2. RPC `append_document_entity_event(...)` valida que `entity_id` del evento coincida con `p_document_entity_id`.
3. Listener encola jobs con `entity_id` y `correlation_id` iguales al `document_entity_id`.
4. Workers `run-tsa`, `submit-anchor-polygon`, `submit-anchor-bitcoin`, `build-artifact` corrigen mismatches de `correlation_id` al valor canonico del documento.

Resultado: los eventos y jobs quedan correlacionados por documento, no por workflow externo.

## Consultas SQL de auditoria rapida

### A) Verificar mismatch de correlacion por documento
```sql
select
  de.id as document_entity_id,
  ev->>'id' as event_id,
  ev->>'kind' as kind,
  ev->>'entity_id' as entity_id,
  ev->>'correlation_id' as correlation_id
from public.document_entities de
cross join lateral jsonb_array_elements(coalesce(de.events, '[]'::jsonb)) ev
where coalesce(ev->>'entity_id', '') <> de.id::text
   or coalesce(ev->>'correlation_id', '') <> de.id::text;
```

### B) Verificar anchors confirmados sin TSA previo para el mismo documento
```sql
with per_doc as (
  select
    de.id,
    bool_or(ev->>'kind' = 'tsa.confirmed') as has_tsa_confirmed,
    bool_or(ev->>'kind' = 'anchor.confirmed') as has_anchor_confirmed
  from public.document_entities de
  cross join lateral jsonb_array_elements(coalesce(de.events, '[]'::jsonb)) ev
  group by de.id
)
select *
from per_doc
where has_anchor_confirmed = true
  and has_tsa_confirmed = false;
```

## Fuentes de verdad (codigo)
- `supabase/migrations/20260106090000_document_entities.sql`
- `supabase/migrations/20260224163000_canonicalize_listener_dedupe_and_signature_evidence.sql`
- `supabase/migrations/20260131000600_guard_tsa_confirmed_prerequisites.sql`
- `supabase/migrations/20260216001700_enforce_required_evidence_constraint.sql`
- `supabase/migrations/20260131001200_enforce_event_envelope_on_append.sql`
- `supabase/functions/_shared/eventHelper.ts`
- `supabase/functions/_shared/decisionEngineCanonical.ts`
- `supabase/functions/_shared/protectDocumentV2PipelineDecision.ts`
- `supabase/functions/fase1-executor/index.ts`
- `supabase/functions/run-tsa/index.ts`
- `supabase/functions/submit-anchor-polygon/index.ts`
- `supabase/functions/submit-anchor-bitcoin/index.ts`
- `supabase/functions/process-polygon-anchors/index.ts`
- `supabase/functions/process-bitcoin-anchors/index.ts`
- `supabase/functions/build-artifact/index.ts`
