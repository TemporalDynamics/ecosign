# PROTECT_DOCUMENT_V2 (Contrato Normativo)

Estado: Propuesto (Fase 2/3)

Este documento define el flujo canonico `protect_document_v2`.
Es normativo: el codigo debe obedecerlo sin interpretacion ad-hoc.

## 1) Principios
- La verdad canonica vive solo en `document_entities.events[]`.
- El executor decide; los workers ejecutan.
- Todo es idempotente y re-ejecutable.
- La UI deriva estados solo desde events[].

## 2) Eventos canonicos
El sistema MUST emitir solo estos eventos dentro de este flujo:
- `document.protected.requested`
- `tsa.confirmed`
- `tsa.failed`
- `anchor.submitted`
- `anchor.confirmed`
- `anchor.failed`
- `artifact.finalized`
- `artifact.failed`

Reglas:
- Cada evento MUST incluir `kind` y `at`.
- `tsa.confirmed` MUST incluir `witness_hash` y `token_b64`.
- `anchor.confirmed` MUST incluir `network` y `confirmed_at`.
- `artifact.finalized` MUST incluir metadatos verificables del artefacto.

## 3) Jobs del executor
El executor MUST soportar estos jobs:
- `protect_document_v2` (orquestador)
- `run_tsa`
- `submit_anchor_polygon`
- `submit_anchor_bitcoin`
- `build_artifact`

## 4) Reglas de decision (executor)
El executor MUST decidir en base a events[]:
- Si falta `document.protected.requested` -> NO hacer nada.
- Si falta `tsa.confirmed` -> ejecutar `run_tsa`.
- Si `tsa.confirmed` existe y falta el/los anchors requeridos -> ejecutar anchor jobs.
- Si `tsa.confirmed` y anchors requeridos confirmados -> ejecutar `build_artifact`.
- Si `artifact.finalized` existe -> flujo completo, no hacer nada.

Regla de idempotencia:
- Un evento MUST NOT ser emitido mas de una vez con el mismo significado logico.

El executor MUST NOT:
- Derivar estado de columnas externas.
- Ejecutar tareas pesadas (solo delega).
- Duplicar eventos ya existentes.

## 5) Responsabilidades de workers
Cada worker MUST:
- Hacer solo trabajo tecnico.
- Emitir eventos canonicos como resultado.
- Ser idempotente ante reintentos.

Mapa:
- `run_tsa` -> `tsa.confirmed` o `tsa.failed`
- `submit_anchor_*` -> `anchor.submitted` / `anchor.confirmed` / `anchor.failed`
- `build_artifact` -> `artifact.finalized` o `artifact.failed`

Notas:
- `anchor.confirmed` MAY aparecer multiples veces, una por `network`.
- `build_artifact` MAY ejecutarse en un servicio externo (e.g. FFmpeg orchestrator).

## 6) Regla unica para UI
La UI MUST derivar estados solo desde events[]:
- Protegido: existe `tsa.confirmed`
- Reforzado: existe `tsa.confirmed` + `anchor.confirmed`
- Final: existe `artifact.finalized`

La UI MUST NOT:
- Leer `lifecycle_status`
- Inferir por `tsa_latest`
- Derivar por workflows o triggers

## 7) Fases de implementacion
- Fase 2: TSA + anchors (sin artifacts).
- Fase 3: artifacts (FFmpeg) bajo `build_artifact`.

Todo lo no implementado MUST permanecer documentado, no simulado.
