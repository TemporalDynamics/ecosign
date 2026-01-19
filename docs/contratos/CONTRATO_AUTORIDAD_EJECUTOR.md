# CONTRATO_AUTORIDAD_EJECUTOR

Fecha: 2026-01-16
Estado: Canonical
Version: v1.0

## Veredicto general (tranquilizador, sin anestesia)
No hay caos aleatorio. Hay duplicidad estructural previsible.
El sistema ya es grande y razonable; lo que falta es un arbitro explicito.
Esto no es un bug de codigo: es un contrato implicito que todavia no esta escrito.
La buena noticia: ya existe evidencia append-only que protege la verdad.

## Principio rector
Cada transicion de estado relevante debe tener una sola autoridad de decision.
Si una transicion se puede disparar por multiples caminos validos, es un riesgo real.

## Idempotencia
Toda decision del executor debe ser idempotente y repetible sin alterar la verdad canonica.

## Autoridad vs ejecucion
El executor es la unica autoridad de decision del flujo.
Los workers y edge functions son agentes de ejecucion, sin autoridad semantica.

## Evento canonico (definicion)
Evento canonico = evento que:
- cambia estado observable
- habilita una transicion
- puede ser citado como evidencia

## Convencion canonica de eventos (Fase 1)
- MUST: `kind + at + payload` es la unica forma canonica.
- MUST NOT: `type`, `event`, `timestamp` como fuente de verdad.

## Verdad canonica
La verdad canonica del sistema se expresa exclusivamente mediante eventos canonicos append-only.

## Diagnostico del riesgo real
La misma transicion puede ocurrir por mas de un camino:

1) Anchoring
- trigger automatico (user_documents)
- cron workers (process-polygon-anchors, process-bitcoin-anchors)
- RLS permite INSERT directo en anchors

2) document_entities (verdad canonica)
- usuario puede UPDATE (RLS)
- edge/worker puede UPDATE (service_role)
- triggers enforcing + TSA + uniqueness

3) Workflow completion + notificaciones
- edge/worker detecta ultimo firmante
- trigger notify_workflow_completed
- workers notify-*

## Lo que ya esta bien (y se preserva)
- Append-only en document_entities, workflow_events, signature_application_events, ecox_audit_trail.
- Workers criticos bien aislados: workflow_artifacts, system_emails.

## Contrato de autoridad (propuesta concreta)

1) Executor como unica autoridad de flujo
- Decide el siguiente step y cuando termina.
- Workers/edges ejecutan, no deciden.

2) Escritura de eventos canonicos
- Solo el executor (o sus workers) escribe eventos que alteran estado derivado.
- document_entities.events es append-only y no se escribe desde UI.
 - El executor mantiene ECOX (append-only) y emite snapshots ECO cuando corresponde.

3) Anchoring
- La creacion de anchors pasa por un unico camino (executor/worker).
- RLS para INSERT directo en anchors se elimina o se limita estrictamente.

4) Workflow completion
- notify_workflow_completed pasa a ser side-effect o se desactiva.
- Finalizacion real la decide el executor con evento unico.

5) Notificaciones
- Un solo productor: worker notify-*.
- Triggers de notificacion quedan como compatibilidad temporal o se apagan.

6) Triggers
- No introducen decisiones nuevas.
- Solo derivan side-effects, normalizan timestamps o refuerzan invariantes.

## Transicion
Este contrato no requiere refactors inmediatos.
Define el norte: eliminar duplicidad estructural de forma progresiva.

## Referencias
- AUTORIDAD_DEL_SISTEMA.md
- CONTRATO_ORQUESTACION_FLUJOS.md
- LISTA_IMPLEMENTACION_AUTORIDAD_EJECUTOR.md
- CONTRATO_MAPEO_EJECUTOR.md

## Resultado esperado
El sistema sigue funcionando hoy, pero con un arbitro claro.
El executor no es uno mas, es el unico que decide el progreso.
