# EXECUTOR V2 - Observabilidad Minima

Estado: Propuesto

Este documento define la observabilidad minima requerida para el executor v2.

## 1) Logs estructurados (obligatorio)
Cada corrida MUST loguear:
- `executor_version` (v1/v2)
- `job_id`
- `job_type`
- `document_entity_id`
- `decision` (run_tsa / submit_anchor_* / build_artifact / noop / error)
- `reason` (texto corto)

## 2) Persistencia minima (DB)
Cada ejecucion MUST registrar en `executor_job_runs`:
- `status` (started/succeeded/failed)
- `attempt`
- `worker_id`
- `error` (solo si failed)

Para NOOPs, el executor MAY:
- guardar un mensaje operativo en `executor_job_runs.error`
- o usar `executor_jobs.last_error` con prefijo `noop:`

## 3) Contadores minimos (opcionales)
Si se instrumenta metricas, MUST existir:
- `executor_jobs_claimed_total`
- `executor_jobs_succeeded_total`
- `executor_jobs_failed_total`
- `executor_jobs_noop_total`

## 4) Alertas minimas (opcionales)
- Fallos repetidos del mismo `job_type`.
- Crecimiento sostenido de `executor_jobs` en estado `queued`.
