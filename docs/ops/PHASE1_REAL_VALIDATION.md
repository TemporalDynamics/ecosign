# Phase 1 Real Validation (Single Operator)

Fecha: 2026-02-19
Objetivo: validar Fase 1 con ejecucion real de pipeline, sin depender de smoke sintetico.

## Pre-check local
1. `npm run phase1:gate`
2. Confirmar que `RESULT: PASS` y `READY`.

## Flujo real (staging o prod controlado)
1. Disparar un caso real `protect_document_v2` desde el flujo normal de app.
2. Esperar salida de eventos canónicos (`tsa.confirmed`, `anchor.confirmed` o equivalentes del flujo).
3. Repetir 3 veces seguidas con entidades distintas.

## Evidencia minima por corrida
Guardar en `docs/reports/phase-gates/`:
1. `entity_id`
2. evento de entrada (`document.protected.requested` / `job.*.required`)
3. `executor_jobs.id` materializado
4. `executor_job_runs.id` ejecutado
5. evento de resultado canónico final
6. timestamps para medir `event_to_job_gap`

## Queries de verificacion sugeridas
```sql
-- 1) Evento requerido y materialización de job
SELECT de.id AS entity_id,
       ev->>'type' AS event_type,
       (ev->>'at')::timestamptz AS event_at,
       j.id AS job_id,
       j.created_at AS job_created_at,
       EXTRACT(EPOCH FROM (j.created_at - (ev->>'at')::timestamptz)) AS event_to_job_gap_seconds
FROM document_entities de
CROSS JOIN LATERAL jsonb_array_elements(de.events) ev
LEFT JOIN executor_jobs j
  ON j.entity_id = de.id
 AND j.type = REPLACE(ev->>'type', '.required', '')
WHERE ev->>'type' LIKE 'job.%.required'
ORDER BY j.created_at DESC
LIMIT 100;

-- 2) Trazabilidad job -> run
SELECT j.id AS job_id,
       j.entity_id,
       j.type,
       j.status,
       r.id AS run_id,
       r.status AS run_status,
       r.created_at AS run_created_at,
       r.finished_at
FROM executor_jobs j
LEFT JOIN executor_job_runs r ON r.job_id = j.id
ORDER BY j.created_at DESC
LIMIT 100;
```

## Criterio de salida Fase 1
1. 3 corridas reales consecutivas exitosas.
2. `event_to_job_gap <= 60s` en p95 de esas corridas.
3. Sin SQL manual para destrabar progresion.
4. Trazabilidad completa en los 3 casos.
