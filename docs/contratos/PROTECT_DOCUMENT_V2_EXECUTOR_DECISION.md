# PROTECT_DOCUMENT_V2 - Decision Logic (Executor)

Estado: Propuesto (Fase 2/3)

Este documento describe la logica de decision del executor para `protect_document_v2`.
No contiene codigo. Es un diagrama textual determinista.

## Inputs
- `events[]` del document_entity.
- Configuracion de proteccion (redes requeridas, artifact requerido).

## Estados derivados (solo por events[])
- `has_request`: existe `document.protected.requested`
- `has_tsa`: existe `tsa.confirmed`
- `has_polygon`: existe `anchor.confirmed` con `network=polygon`
- `has_bitcoin`: existe `anchor.confirmed` con `network=bitcoin`
- `has_artifact`: existe `artifact.finalized`

## Decisiones (orden estricto)
1) Si `has_request` es false -> NOOP.
2) Si `has_tsa` es false -> ejecutar `run_tsa`.
3) Si requiere anchors:
   - Si `has_polygon` es false -> ejecutar `submit_anchor_polygon`.
   - Si `has_bitcoin` es false -> ejecutar `submit_anchor_bitcoin`.
4) Si requiere artifact:
   - Si `has_artifact` es false y `has_tsa` true y anchors requeridos confirmados -> ejecutar `build_artifact`.
5) Si `has_artifact` es true -> NOOP (flujo completo).

Notas de evaluacion:
- Las decisiones se evaluan de arriba hacia abajo en una sola pasada logica.
- El executor MAY ejecutar multiples jobs en una misma corrida si las precondiciones lo permiten.

## Reglas globales
- El executor MUST NOT ejecutar un job si el evento correspondiente ya existe.
- El executor MUST ser idempotente ante reintentos.
- Los workers MUST emitir eventos canonicos o fallas explicitas.
