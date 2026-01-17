# EXPLICACION_EJECUTOR_Y_FLUJOS

Fecha: 2026-01-16
Estado: Canonical
Version: v1.0

Documento unico que explica el objetivo del executor, como funciona el sistema y
como se traduce cada combinacion de intent en jobs y eventos canonicos.

## 1) Objetivo del executor (resumen corto)
- El executor es la unica autoridad de decision del flujo.
- La UI solo declara intencion (CTA).
- Los workers/edge ejecutan tareas y escriben resultados (eventos canonicos).
- El avance del flujo ocurre solo cuando el executor observa eventos canonicos.

## 2) Roles del sistema (modelo mental)
- UI (CTA): declara intencion, no decide el flujo.
- Executor (capataz): decide el siguiente paso y cuando finaliza.
- Workers/Edge (albaniles): ejecutan tareas puntuales y reportan resultado.
- Ledger/Evidence (verdad canonica): eventos append-only citables.

Regla de oro: el executor decide; los workers escriben resultados.

## 3) Cuando trabaja el executor y cuando delega
El executor trabaja cuando:
- entra una intencion (CTA)
- llega un evento canonico
- un job vencido requiere retry

El executor delega cuando:
- determina que toca ejecutar un paso
- encola un job

El executor no avanza por haber llamado a un worker.
Avanza cuando ve el evento canonico que confirma el paso.

## 4) Flujo general desde Centro Legal
1. Upload + CTA -> se registra intencion (no ejecucion)
2. Executor genera la secuencia de jobs segun intent
3. Workers ejecutan cada job
4. Workers escriben eventos canonicos
5. Executor observa eventos y decide el siguiente job

## 5) Estados y eventos canonicos (base)
Eventos canonicos minimos:
- source.encrypted
- witness.created
- tsa.appended
- anchor.confirmed
- artifact.finalized

Estados derivados (no canonicos):
- needs_witness
- witness_ready
- anchored
- completed

## 6) Intents canonicos (agnosticos)
- entity.prepare
- entity.attest
- entity.anchor
- entity.finalize

## 7) Traduccion de intents a jobs y eventos

Intent | Jobs (worker) | Evento canonico que confirma
--- | --- | ---
entity.prepare | store-encrypted-custody (si aplica) + create witness | source.encrypted (+ witness.created si aplica)
entity.attest | append-tsa-event | tsa.appended
entity.anchor | process-polygon-anchors / process-bitcoin-anchors | anchor.confirmed
entity.finalize | build-final-artifact (+ notify) | artifact.finalized

Nota: notificaciones son side-effects no bloqueantes.

## 8) Opciones del CTA y combinaciones
Opciones posibles desde Centro Legal:
- NDA
- Proteccion (TSA / Polygon / Bitcoin)
- Mi firma
- Flujo de firmas (workflow)

Cada opcion activa intents. Las combinaciones son la union de intents.

### 8.1 NDA
- Intents: entity.prepare -> entity.attest -> entity.anchor -> entity.finalize
- Jobs: create NDA witness, append TSA, anchors segun config, build artifact
- Eventos: witness.created, tsa.appended, anchor.confirmed, artifact.finalized

### 8.2 Proteccion (TSA/Polygon/Bitcoin)
- Intents: entity.prepare -> entity.attest -> entity.anchor -> entity.finalize
- Jobs:
  - prepare: encrypt source (si aplica) + witness
  - attest: TSA
  - anchor: polygon/bitcoin segun forensic config
  - finalize: build artifact
- Eventos: source.encrypted, witness.created, tsa.appended, anchor.confirmed, artifact.finalized

### 8.3 Mi firma (firma del owner)
- Intents: entity.prepare -> entity.attest -> entity.anchor -> entity.finalize
- Jobs: mismos que proteccion + aplicacion de firma (worker especializado)
- Eventos canonicos: signature_applied (si aplica en ledger) + tsa.appended + anchor.confirmed + artifact.finalized

### 8.4 Flujo de firmas (workflow)
- Intents: entity.prepare -> entity.attest -> entity.anchor -> entity.finalize
- Jobs:
  - prepare: lock workflow + witness
  - attest: TSA
  - anchor: polygon/bitcoin
  - finalize: build artifact
- Eventos: workflow.locked, witness.created, tsa.appended, anchor.confirmed, artifact.finalized

## 9) Tabla de combinaciones (intents -> jobs)

Combinacion CTA | Intents resultantes | Jobs base
--- | --- | ---
Solo NDA | prepare, attest, anchor, finalize | witness -> TSA -> anchors -> artifact
Solo Proteccion | prepare, attest, anchor, finalize | encrypt/witness -> TSA -> anchors -> artifact
Solo Mi firma | prepare, attest, anchor, finalize | encrypt/witness -> TSA -> anchors -> artifact + signature_applied
Solo Workflow | prepare, attest, anchor, finalize | lock/witness -> TSA -> anchors -> artifact
NDA + Proteccion | prepare, attest, anchor, finalize | witness + encrypt -> TSA -> anchors -> artifact
NDA + Mi firma | prepare, attest, anchor, finalize | witness + signature -> TSA -> anchors -> artifact
NDA + Workflow | prepare, attest, anchor, finalize | witness + lock -> TSA -> anchors -> artifact
Proteccion + Mi firma | prepare, attest, anchor, finalize | encrypt/witness + signature -> TSA -> anchors -> artifact
Proteccion + Workflow | prepare, attest, anchor, finalize | encrypt/witness + lock -> TSA -> anchors -> artifact
Mi firma + Workflow | prepare, attest, anchor, finalize | lock/witness + signature -> TSA -> anchors -> artifact
NDA + Proteccion + Mi firma | prepare, attest, anchor, finalize | witness + encrypt + signature -> TSA -> anchors -> artifact
NDA + Proteccion + Workflow | prepare, attest, anchor, finalize | witness + encrypt + lock -> TSA -> anchors -> artifact
NDA + Mi firma + Workflow | prepare, attest, anchor, finalize | witness + lock + signature -> TSA -> anchors -> artifact
Proteccion + Mi firma + Workflow | prepare, attest, anchor, finalize | encrypt/witness + lock + signature -> TSA -> anchors -> artifact
NDA + Proteccion + Mi firma + Workflow | prepare, attest, anchor, finalize | witness + encrypt + lock + signature -> TSA -> anchors -> artifact

## 10) Quien escribe cuando
- UI: solo declara intencion (CTA).
- Executor: decide el siguiente paso.
- Workers/Edge: ejecutan y escriben eventos canonicos.
- Ledger: recibe eventos append-only.

El executor nunca escribe evidencia; solo decide que ejecutar y valida eventos.
