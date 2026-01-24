-- H1 snapshot: capture events + executor runs for a single document_entity_id
-- Usage:
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -v document_entity_id='UUID_HERE' -f scripts/h1-run-snapshot.sql

\echo '\n== H1 SNAPSHOT =='
\echo 'document_entity_id = :'document_entity_id

\echo '\n-- document_entities.events[]'
SELECT id, events
FROM document_entities
WHERE id = :'document_entity_id';

\echo '\n-- executor_jobs (by entity_id)'
SELECT id, type, status, attempts, run_at, created_at, updated_at, last_error
FROM executor_jobs
WHERE entity_id = :'document_entity_id'
ORDER BY created_at ASC;

\echo '\n-- executor_job_runs (by job_id)'
SELECT r.job_id, r.status, r.attempt, r.worker_id, r.started_at, r.finished_at, r.duration_ms, r.error
FROM executor_job_runs r
JOIN executor_jobs j ON j.id = r.job_id
WHERE j.entity_id = :'document_entity_id'
ORDER BY r.started_at ASC;
