# CANONICAL EVENTS — MASTER (Consolidado)

Fecha: 2026-01-18T13:47:12.826Z
Estado: BORRADOR (revisión requerida)

Propósito
--------
Consolidar en un único lugar la lista canónica de eventos y las reglas mínimas que la UI y los workers deben tomar como verdad antes de tocar código. Este documento agrupa la información existente (CANONICAL_EVENTS_LIST.md, ANCHOR_EVENT_RULES.md, OPERATIONS_EVENTS_CONTRACT.md, constantes en código) y fija una referencia clara para el MVP Fase 1.

Principios canónicos
--------------------
- Fuente de verdad: document_entities.events[] (append-only). Las tablas legacy pueden usarse como proyección temporal, nunca como verdad.
- Estructura mínima: { "kind": string, "at": ISO8601, ...payload }
- Identificadores obligatorios: cada evento debe incluir document_entity_id (o workflow_id) y actor meta cuando aplique.
- Idempotencia: reintentos deben ser silenciosos y no duplicar evidencia.

Lista canónica propuesta (Fase 1)
---------------------------------
Se propone la siguiente lista mínima de eventos canónicos para la Fase 1 (nombres normalizados y recomendados):

- workflow.created
- workflow.activated
- workflow.completed
- workflow.cancelled

- document.protected            # Protección aplicada (deriva ready)
- document.decrypted

- tsa.appended                  # TSA token agregado (o tsa.confirmed si se decide usar "confirmed")
- tsa.failed

- anchor                        # Evento genérico de anchor; payload indica network y estado
  - Forma preferida (append):
    {
      "kind": "anchor",
      "at": "...",
      "anchor": { "network": "polygon|bitcoin", "witness_hash": "...", "txid": "...", "block_height": n?, "confirmed_at": "..." }
    }
  - En la proyección/consumo se pueden emitir alias de intención: anchor.pending, anchor.confirmed, anchor.failed — pero la UI y la derivación siempre deben consultar events[] y normalizar por `kind === 'anchor'` y `anchor.network`.

- signer.invited / signer.ready_to_sign / signer.signed / signer.cancelled
- document.change_requested / document.change_resolved
- workflow.artifact_finalized
- anchor.failed

Derivación de estados UI (función pura sobre events[])
------------------------------------------------------
Recomendar derivar el estado humano/visual a partir de una función pura que recorra events[] (ejemplo simplificado):

- draft: no hay document.protected ni anchors ni tsa
- ready: existe document.protected (y precondiciones cumplidas)
- running: existe job en executor_jobs con status claimed/in-progress (proyección)
- anchored: existe evento anchor con anchor.network === 'polygon' (o 'bitcoin') y confirmed_at
- completed: workflow.completed o workflow.artifact_finalized
- error: anchor.failed o tsa.failed o eventos terminales de error

Hechos operacionales (qué escribe cada componente)
-------------------------------------------------
- UI: appendEvent(draft/protection intent) → document_entities.events[]
- Executor: crea filas en executor_jobs; decide claim/execute basándose en events[] y precondiciones; registra claims/metadata en executor_jobs
- Worker: realiza acción (ej. submit tx), registra resultado en executor_job_runs (idempotente) y appendEvent(anchor / anchor intent)

Convenciones para workers
-------------------------
- Idempotencia estricta: checks previos por witness_hash + network + txid
- Registrar cada intento en executor_job_runs con status y payload
- Publicar evento canónico en document_entities.events[] sólo cuando la validación lo permita
- No confiar en tablas legacy para decisiones (solo events[])

Siguiente paso
---------------
1) Revisar y aprobar estos nombres normalizados.
2) Si hay consenso, actualizar constantes en código para usar estas convenciones y/o implementar adaptadores de lectura que normalicen aliases.

Notas
-----
Este archivo es una referencia de trabajo; en el checklist se detallan discrepancias observadas entre documentos y código y recomendaciones concretas para resolverlas.
