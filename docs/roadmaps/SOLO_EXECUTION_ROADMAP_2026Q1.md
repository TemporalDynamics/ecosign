# Solo Execution Roadmap (Q1 2026)

Fecha base: 2026-02-19
Operador: Manuel (single operator)
Modo de validacion: pruebas reales (no smoke sintetico como requisito de avance)

## Objetivo
Ejecutar el RFC por fases, con cambios en produccion controlados y evidencia real por fase.

## Reglas globales
1. No avanzar por calendario; avanzar solo por criterios de salida cumplidos.
2. Cada fase deja evidencia en `docs/reports/phase-gates/`.
3. `document_entities.events[]` autoridad unica, `executor_jobs` cola unica, `user_documents` proyeccion.
4. SQL manual permitido solo para forensics/post-mortem, no para destrabar flujo normal.

## Fase 1 (inmediata): estabilizacion operativa
Ventana objetivo: 2026-02-19 a 2026-03-06

Entrega tecnica minima:
1. Guardrail anti-drift activo en repo:
- prohibir inserts directos a `executor_jobs` en codigo runtime.
- `claim_initial_decision_jobs` solo en `fase1-executor`.
- `claim_orchestrator_jobs` solo en `orchestrator`.
2. Readiness checks actualizados para incluir guardrail de entrypoint.
3. Validacion real del flujo en entorno real (staging o prod controlado):
- al menos 3 corridas reales de `protect -> tsa -> anchor` con trazabilidad completa evento->job->run.
4. Verificacion de trigger core habilitado (`on_document_entity_events_change`).
5. Verificacion de migracion de fix de dedupe key ambiguo desplegada.

Criterio de salida Fase 1:
1. Guardrails pasan en CI/local sin excepciones.
2. 3 corridas reales consecutivas exitosas con evidencia de trazabilidad.
3. Cero necesidad de SQL manual para progresion normal durante la ventana de validacion.

## Fase 2: gateway unico + compat/strict
Ventana objetivo: 2026-03-07 a 2026-04-03

Entrega tecnica minima:
1. Gateway unico declarado e implementado para materializar jobs.
2. Modo `compat` con warning estructurado por path legacy.
3. Corte a `strict` cuando warnings de compat lleguen a cero sostenido.
4. Remocion de lecturas autoritativas desde `user_documents` en decision path.

Criterio de salida Fase 2:
1. 100% de materializacion de jobs por gateway.
2. Warnings de compat = 0 por 7 dias.
3. Ningun path legacy crea jobs fuera del gateway.

## Fase 3: observabilidad operativa
Ventana objetivo: 2026-04-04 a 2026-05-01

Entrega tecnica minima:
1. Dashboard unico: eventos recientes, jobs por entidad, runs con errores.
2. KPI `event_to_job_gap` activo (Delta inicial 60s).
3. Alertas: trigger core off, gap, backlog/dead jobs.
4. Runbooks validados en incidente simulado.

Criterio de salida Fase 3:
1. Incidentes detectables en minutos.
2. Trazabilidad end-to-end disponible para cualquier `entity_id`.

## Fase 4: anti-drift continuo
Inicio: 2026-05-02 en adelante

Entrega tecnica minima:
1. Contratos minimos en CI: trigger core, claims scope, whitelist de job types.
2. Clasificacion de migraciones: core/legacy/infra.
3. Limpieza de codigo muerto del pipeline.
4. Test E2E real obligatorio por cambio de pipeline.

Criterio de salud continua:
1. Sin dual authority efectiva.
2. Side effects solo desde evento canonico.
3. Fallo detectable + trazable en una sola ruta.
4. Operacion normal sin SQL manual.

## Protocolo semanal (single operator)
1. Lunes: ejecutar checks de contratos + readiness.
2. Miercoles: correr 1 flujo real end-to-end y guardar evidencia.
3. Viernes: revisar backlog/dead jobs + gap KPI + decidir avance de fase.
