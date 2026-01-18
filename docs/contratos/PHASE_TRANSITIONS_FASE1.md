# FASE 1 — TRANSICIONES (Protección + Anclaje a Polygon)

Generado: 2026-01-18T13:48:49.585Z
Estado: BORRADOR

Objetivo
--------
Marcar de forma inequívoca las transiciones canónicas que definen el flujo para la Fase 1 (protección seguida de anclaje a Polygon). Cada transición está definida por eventos canónicos que sirven de única fuente de verdad y que derivan los estados que consume la UI; además se especifican las acciones (jobs) que deben crearse y cómo las workers deben registrar sus ejecuciones.

Resumen de fases y eventos canónicos (orden temporal)
-----------------------------------------------------
1) Draft (estado inicial)
   - Condición: no existen eventos de protección ni anchor.
   - UI state: draft

2) Protección — intención
   - Evento de intención (canónico recomendado): `document.protection_requested` (payload: { actor, document_entity_id, requested_at })
   - Qué crea: executor crea un job `fase1.protect_and_anchor` (claims permitted when owner == actor o reglas de RLS permitan)
   - UI state derivado: "protection_requested" / ready-to-run (si precondiciones ok)

3) Protección — aplicada (transición)
   - Evento canónico que marca la transición: `document.protected`
     - Payload mínimo: { protection_level: "NONE|TSA|REINFORCED|TOTAL", method: "edge|client|service", at, meta: {...} }
   - Derivación UI: si existe `document.protected` → estado `ready` (documento protegido y listo para anclar)
   - Job/Worker: el worker, tras aplicar protección, debe registrar en `executor_job_runs` (idempotente) y publicar `document.protected` antes de proceder al envío de la transacción de anclaje.

4) Anclaje — intención / envío (transición a ejecución de blockchain)
   - Evento operativo opcional: `anchor.pending` o publicación de un intento en `executor_job_runs` con tipo `anchor_submit`.
   - Qué crea: cuando worker envía tx a Polygon, debe publicar internamente un registro en `executor_job_runs` y emitir (si se decide mantener alias operativo) `anchor.pending` con payload parcial: { network: "polygon", witness_hash, txid?, submitted_at }
   - UI state derivado: `anchoring` / `running`

5) Anclaje — confirmado (transición canónica definitiva)
   - Evento canónico definitivo: `anchor` (kind: "anchor") con payload:
     {
       kind: "anchor",
       at: "...",
       anchor: { network: "polygon", witness_hash: "...", txid: "...", block_height?: n, confirmed_at: "..." }
     }
   - Regla: confirmed_at indica confirmación externa; la presencia de este evento con anchor.network === 'polygon' es la prueba canónica del anclaje.
   - UI state derivado: `anchored` (Polygon anchored)

6) Finalización de flujo (opcional en Fase 1)
   - Evento canónico: `workflow.artifact_finalized` o `workflow.completed` (payload incluye document_entity_id, at)
   - UI state derivado: `completed`

7) Errores/terminales
   - Eventos canónicos de fallo: `tsa.failed`, `anchor.failed` (payload: reason, at, retriable:boolean)
   - UI state derivado: `error` junto a metadata para reintento/manual remediation

Reglas de transición y responsabilidades (executor vs worker)
------------------------------------------------------------
- Executor (responsabilidad mínima):
  - Validar precondiciones leyendo `document_entities.events[]` (única fuente de verdad).
  - Crear job en `executor_jobs` y marcarlo `claimed` cuando las precondiciones se cumplan.
  - NO ejecutar lógica compleja de protección o blockchain; sólo decide y delega.

- Worker (responsabilidad completa):
  - Ejecutar la acción (protección y/o anclaje) de forma idempotente.
  - Antes de cada paso crítico, verificar existencia previa del evento canónico (ej.: si `document.protected` ya existe, omitir la protección).
  - Registrar cada intento/resultado en `executor_job_runs` con payload, timestamps y status (`started`, `succeeded`, `failed`) para auditoría.
  - Publicar eventos canónicos reservados: `document.protected` y `anchor` (con `confirmed_at`) sólo tras validar invariantes (witness_hash, network, etc.).

Derivación de estados UI (implementación sugerida)
-------------------------------------------------
- La UI debe calcular su estado ejecutando una función pura `deriveHumanState(events[])` que consulta únicamente `document_entities.events[]`.
- Ejemplo simplificado de derivación (pseudo):
  - if (exists workflow.completed) -> completed
  - else if (exists anchor.kind=='anchor' && anchor.network=='polygon' && anchor.confirmed_at) -> anchored
  - else if (exists document.protected) -> ready
  - else if (exists document.protection_requested && no document.protected) -> protection_requested
  - else -> draft

Consideraciones de idempotencia y validación
-------------------------------------------
- Workers deben tratar reintentos como idempotentes: comprobar `document.protected` y buscar eventos `anchor` existentes por network+witness_hash+txid antes de publicar o repetir.
- Las validaciones de anchor deben cumplir reglas en ANCHOR_EVENT_RULES.md: witness_hash === document_entities.witness_hash, único por network (según contrato), no edición de eventos.
- Todos los side-effects observables por la UI son los append-only events; tablas legacy solo como proyección eventual.

Jobs recomendados y naming (MVP)
--------------------------------
- `fase1.protect_and_anchor` — job unitario que ejecuta protección y enviar tx Polygon en secuencia (MVP recomendable para simplicidad). Worker debe escribir dos eventos: `document.protected` y `anchor`.
- Alternativa (más modular): `fase1.protect` y `fase1.anchor_submit` con un pequeño orquestador (executor) que encadene ambos jobs leyendo events[].

Checklist de verificación al ejecutar la transición en staging
--------------------------------------------------------------
- El UI appendEvent de `document.protection_requested` crea job y aparece en `executor_jobs`.
- Executor reclama job `fase1.protect_and_anchor` y marca claim.
- Worker guarda `executor_job_runs` con `started`→`succeeded` y publica `document.protected`.
- Worker envía tx a Polygon, registra `executor_job_runs` y publica `anchor` con `confirmed_at` cuando recibe confirmación.
- La UI, leyendo events[], pasa a `anchored` tras la aparición de `anchor.confirmed_at`.

Siguiente paso
---------------
- Revisar y acordar estos nombres exactos (`protection_requested`, `document.protected`, `anchor` con payload canonical) para que el equipo adapte constants y appendEvent wrapper; una vez acordado, actualizar supabase/functions/_shared/fase1Events.ts y añadir normalización en el punto de escritura de eventos.

