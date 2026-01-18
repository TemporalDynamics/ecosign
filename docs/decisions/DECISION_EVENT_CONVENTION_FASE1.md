# DECISION_EVENT_CONVENTION_FASE1

Estado: ACTIVA
Fecha: 2026-01-18

## Decision
En Fase 1, la unica convencion valida de eventos es `kind + at + payload`.
El Executor es el lector exclusivo de eventos canonicos para cerrar pasos.

## Regla dura
- Solo `kind + at + payload` es canonico.
- `event`, `type` o `timestamp` son derivados y no pueden cerrar pasos.
- Si un evento no puede expresarse en esta forma, no se ejecuta la accion.

## Alcance
Aplica a contratos, workflows, TSA, anchors, UI y verificador.

## No decisiones
- No se reescriben contratos existentes.
- No se cambia semantica legal ni probatoria.
- No se implementa codigo en esta decision.

## Relacion con el cierre de Fase 1
La convencion canonica de eventos definida en este documento
(`kind + at + payload`) es un prerrequisito para el criterio de
cierre de Fase 1.

El criterio de cierre operativo se define exclusivamente en
`docs/contratos/FASE_1_CONTRATO_OPERATIVO.md` y no se duplica aqui.

Esta decision garantiza que el cierre de Fase 1 pueda evaluarse
leyendo unicamente eventos canonicos, sin interpretacion externa.
