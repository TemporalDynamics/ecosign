# BUILD_ARTIFACT - Interfaz Minima del Worker

Estado: Propuesto (Fase 3)

Este documento define la interfaz minima del worker `build_artifact`
cuando es invocado por el executor v2.

## 1) Input del job
El job MUST incluir:
- `document_entity_id` (uuid)

El job MAY incluir:
- `document_id` (uuid)
- `artifact_format` (default: `pdf`)
- `artifact_version` (default: `v1`)

El worker MUST resolver el resto de datos desde la DB (document_entities + events[]).

## 2) Output canonico (eventos)
Al finalizar, el worker MUST emitir exactamente uno:
- `artifact.finalized`
- `artifact.failed`

`artifact.finalized` MUST incluir:
- `artifact_storage_path`
- `artifact_hash`
- `mime`
- `size_bytes`
- `artifact_version`

`artifact.failed` MUST incluir:
- `reason`
- `retryable` (boolean)

## 3) Idempotencia
- Si ya existe `artifact.finalized`, el worker MUST NOOP.
- El worker MUST ser seguro ante reintentos (mismo input -> mismo output).

## 4) Responsabilidad tecnica
- El worker MAY ejecutarse en un servicio externo (e.g. FFmpeg orchestrator).
- El worker MUST NOT decidir el flujo ni emitir otros eventos.
