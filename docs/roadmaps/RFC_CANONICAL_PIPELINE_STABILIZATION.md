# RFC: Canonical Pipeline Stabilization and Observability

Fecha: 2026-02-19
Estado: Draft for approval
Owner primario: Platform
Scope: `document_entities.events[]` authority, `executor_jobs` queue authority, `user_documents` projection-only

## 1) Objetivo
Dejar el pipeline robusto y observable a largo plazo con una sola ruta de verdad:
`evento canonico -> job -> run -> resultado canonico`.

## 2) Decisiones de arquitectura (aplican desde Fase 1)
1. `document_entities.events[]` es la unica autoridad de dominio.
2. `executor_jobs` es la unica cola de ejecucion.
3. Separacion operativa de triggers:
- core: `always-on` (bloqueantes para progresion),
- proyecciones: `best-effort` (no autoritativas para progresion).
4. `user_documents` es solo proyeccion derivada (best-effort), nunca autoridad.
5. `fase1-executor` decide; `orchestrator` ejecuta; `scheduler` solo despierta.
6. Regla anti-drift inmediata: no se agregan nuevos inserts directos a `executor_jobs` fuera del gateway/listener canonico.
7. `Single entry point`: el gateway canonico es la unica funcion autorizada a materializar jobs en `executor_jobs`.

## 3) Plan por fases

### Fase 1: Estabilizacion operativa + anti-drift inmediato
Ventana: 2026-02-23 a 2026-03-06 (1-2 semanas)
Owners: Platform (A), Backend (R), QA/Release (R)

Entregables:
1. Roles congelados (`fase1-executor` decide, `orchestrator` ejecuta).
2. Trigger core `on_document_entity_events_change` siempre habilitado.
3. Fix bloqueante desplegado y verificado: dedupe key ambiguo.
4. Gate de PR activo: rechazo de nuevos inserts directos a `executor_jobs`.
5. Canary obligatorio:
- `claim_initial_decision_jobs` solo jobs de decision.
- `claim_orchestrator_jobs` solo jobs de ejecucion.
- Smoke E2E real: `protect -> tsa -> anchor`.

Criterio de aceptacion:
1. No se mergea ningun PR con nuevo insert directo a `executor_jobs` fuera del gateway.
2. Canary + smoke E2E pasan en staging por al menos 5 corridas consecutivas.
3. Trigger core queda monitoreado y habilitado sin excepciones.

### Fase 2: Gateway unico con migracion suave
Ventana: 2026-03-09 a 2026-04-03 (2-4 semanas)
Owners: Platform (A), Backend (R), Data (C)

Entregables:
1. Gateway unico para creacion/materializacion de jobs.
2. Modo `compat`: redirige paths legacy al gateway y emite warning/evento de compat.
3. Modo `strict`: rechaza inserciones directas fuera del gateway.
4. Deshabilitacion de paths legacy que disparan negocio desde `user_documents`.

Criterio de aceptacion:
1. 100% de jobs nuevos pasan por gateway.
2. Warnings de compatibilidad bajan a cero antes de activar `strict`.
3. `user_documents` sin lecturas autoritativas en decision path.

### Fase 3: Observabilidad de verdad
Ventana: 2026-04-06 a 2026-05-01 (2-4 semanas)
Owners: SRE/Platform (A), Backend (R), Data/BI (R)

Entregables:
1. Dashboard minimo unico:
- eventos recientes,
- jobs por entidad,
- runs por job con errores.
2. KPI #1 `event_to_job_gap`:
- si existe `job.*.required` en T,
- debe existir job materializado en `T + Delta`.
- `Delta` inicial: 60s (ajustable por tipo de job tras baseline de 2 semanas).
3. Alertas automaticas:
- trigger core deshabilitado,
- gap `event_to_job_gap`,
- backlog/retry/dead jobs.
4. Trazabilidad obligatoria en jobs/runs:
- `correlation_id`,
- `trace_id`.
5. Runbooks:
- no se encola,
- se encola y no ejecuta,
- ejecuta y no emite evento.

Criterio de aceptacion:
1. Fallos comunes detectables en minutos (SLO definido en alertas).
2. Para cualquier `entity_id`, existe ruta de trazado completa evento->job->run->resultado.
3. Runbooks probados en simulacros de incidente.

### Fase 4: Anti-drift continuo y mantenimiento
Inicio: 2026-05-04 en adelante (continuo)
Owners: Platform (A), Backend (R), QA/Release (R)

Entregables:
1. Migraciones historicas se conservan y clasifican: `core`, `legacy`, `infra`.
2. Contratos en CI/CD (arranque minimo):
- trigger core habilitado,
- funciones claim correctas,
- whitelist de `job_types`.
3. Limpieza de codigo muerto (handlers no reclamados).
4. Disciplina de release: cada cambio del pipeline con test E2E de flujo completo.

Criterio de aceptacion:
1. No regresiones de autoridad detectadas en CI.
2. Pipeline no depende de SQL manual para operacion normal.
3. SQL manual se usa solo en forensics/post-mortem.

## 4) Definicion operativa de sistema sano
1. No existe dual authority efectiva.
2. Todo side effect nace de un evento canonico.
3. Cualquier fallo se detecta en minutos y se traza en una sola ruta.
4. El flujo normal no requiere SQL manual para avanzar.

## 5) Riesgos y mitigaciones
1. Riesgo: romper paths legacy ocultos al unificar entrada.
Mitigacion: `compat` con redireccion + warning + corte gradual a `strict`.
2. Riesgo: confundir trigger core con triggers de proyeccion.
Mitigacion: separar explicitamente `core always-on` vs `projection best-effort`.
3. Riesgo: sobrecargar CI/CD con demasiados contratos al inicio.
Mitigacion: empezar con 3 checks minimos y ampliar por etapas.

## 6) Go/No-Go por fase
Solo se avanza de fase por criterios de aceptacion cumplidos, no por calendario.
