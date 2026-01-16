# EXECUTOR_FLOW_MAPPING

Fecha: 2026-01-15
Estado: Approved (v1)

## Objetivo
Congelar el mapeo canonico de orquestacion:
CTA -> Intent -> Job -> Executor step -> Worker/Edge -> Evento canonico -> Estado derivado.

Este documento es la fuente de verdad para implementar el Executor y evita
mezclar capas o decisiones implicitas.

## Fuentes
- docs/contratos/CONTRATO_ORQUESTACION_FLUJOS.md
- docs/contratos/HAPPY_PATH_SIGNATURE_WORKFLOW_CONTRACT.md
- docs/contratos/CONTRATO_ARTEFACTO_WORKFLOW.md
- docs/contratos/CONTRATO_ARTEFACTO_FINAL.md
- docs/happy-paths/ECOSIGN_HAPPY_PATHS.md

## Principios
- El Executor no ejecuta dominio: solo coordina y delega.
- Un CTA declara intencion; no codifica el flujo.
- Un job queda completado solo por el evento canonico correspondiente.
- Los estados derivados se proyectan desde eventos; el Executor no escribe
  estados salvo `failed`.

## CTAs en alcance
- Proteger documento
- Firmar documento (mi firma)
- Firma de workflow (firmantes)
- NDA

## Intents canonicos (agnosticos)
- entity.prepare
- entity.attest
- entity.anchor
- entity.finalize

## Matriz canonica de orquestacion

CTA | Intent | Job (agnostico) | Executor step | Worker/Edge | Evento canonico esperado | Estado derivado
--- | --- | --- | --- | --- | --- | ---
Proteger documento | Preparar | entity.prepare | encrypt source (+ witness si aplica) | store-encrypted-custody (Edge/Worker) | source.encrypted (+ witness.created si aplica) | needs_witness
Proteger documento | Atestiguar | entity.attest | append TSA | append-tsa-event (Edge/Worker) | tsa.appended | witness_ready
Proteger documento | Anclar | entity.anchor | anchor polygon/bitcoin | process-polygon-anchors / process-bitcoin-anchors | anchor.confirmed | anchored
Proteger documento | Finalizar | entity.finalize | build (+ notify) | build-final-artifact | artifact.finalized | completed

Firmar documento (mi firma) | Preparar | entity.prepare | encrypt source (+ witness si aplica) | store-encrypted-custody (Edge/Worker) | source.encrypted (+ witness.created si aplica) | needs_witness
Firmar documento (mi firma) | Atestiguar | entity.attest | append TSA | append-tsa-event (Edge/Worker) | tsa.appended | witness_ready
Firmar documento (mi firma) | Anclar | entity.anchor | anchor polygon/bitcoin | process-polygon-anchors / process-bitcoin-anchors | anchor.confirmed | anchored
Firmar documento (mi firma) | Finalizar | entity.finalize | build (+ notify) | build-final-artifact | artifact.finalized | completed

Firma de workflow (firmantes) | Preparar | entity.prepare | lock workflow + witness | TBD | workflow.locked, witness.created | needs_witness
Firma de workflow (firmantes) | Atestiguar | entity.attest | append TSA | append-tsa-event (Edge/Worker) | tsa.appended | witness_ready
Firma de workflow (firmantes) | Anclar | entity.anchor | anchor polygon/bitcoin | process-polygon-anchors / process-bitcoin-anchors | anchor.confirmed | anchored
Firma de workflow (firmantes) | Finalizar | entity.finalize | build (+ notify) | build-final-artifact | artifact.finalized | completed

NDA | Preparar | entity.prepare | create NDA witness | TBD | witness.created | needs_witness
NDA | Atestiguar | entity.attest | append TSA | append-tsa-event (Edge/Worker) | tsa.appended | witness_ready
NDA | Anclar | entity.anchor | anchor polygon/bitcoin | process-polygon-anchors / process-bitcoin-anchors | anchor.confirmed | anchored
NDA | Finalizar | entity.finalize | build (+ notify) | build-final-artifact | artifact.finalized | completed

## Estados terminales
- completed: todos los pasos requeridos completos
- failed: estado terminal forzado tras reintentos agotados o error fatal

## No objetivos
- No define UI.
- No define retries o backoff.
- No reemplaza Edge Functions.
- No aplica a firma de workflow en la implementacion inicial del Executor.

## Nota sobre finalize
`entity.finalize` se considera completo cuando se emite `artifact.finalized`.
Las notificaciones son side-effects no bloqueantes.

## Pendientes / TBD
- Identificar nombres exactos de workers/edges para cada step donde dice TBD.
- Confirmar eventos canonicos existentes y faltantes.
- Validar estados derivados exactos en document_entities / workflows.
