# PROTECT_DOCUMENT V1/V2 - Convivencia

Estado: Propuesto

Este documento define como conviven Fase 1 (v1) y Fase 2/3 (v2)
sin mezclar autoridades ni duplicar eventos.

## 1) Principio de seleccion
El flujo se elige por el evento de solicitud:
- V1: `document.protected`
- V2: `document.protected.requested`

Solo uno de estos eventos MUST existir por documento.

## 2) Reglas de exclusividad
- Si existe `document.protected.requested`, el executor v1 MUST NOT actuar.
- Si existe `document.protected`, el executor v2 MUST NOT actuar.
- Si existen ambos (estado invalido), el executor MUST NOOP y registrar un error operativo.
  - El NOOP MAY generar un evento operativo interno (no canonico) para auditoria del executor.

## 3) Canon de eventos por version
V1 (Fase 1):
- Emite solo: `tsa.confirmed` / `tsa.failed`.
- No emite anchors ni artifacts.

V2 (Fase 2/3):
- Emite: `tsa.*`, `anchor.*`, `artifact.*` segun contrato v2.

## 4) Regla UI
La UI MUST derivar estado desde events[] sin leer `lifecycle_status`.
- Protegido: `tsa.confirmed`.
- Reforzado: `tsa.confirmed` + `anchor.confirmed`.
- Final: `artifact.finalized`.

## 5) Migration path (no automatica)
- Documentos existentes en v1 NO se migran automaticamente a v2.
- Una migracion de v1 -> v2 requiere crear un nuevo `document.protected.requested`
  solo si se garantiza idempotencia y ausencia de duplicados.

## 6) Observabilidad minima
Los executors MUST registrar en `executor_job_runs`:
- version: `v1` o `v2`
- reason de NOOP si aplica
