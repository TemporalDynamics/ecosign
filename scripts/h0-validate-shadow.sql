-- H0 — Validación de Línea Base de Autoridad
-- Objetivo: Verificar que shadow mode está activo y comparando correctamente
-- Fecha: 2026-01-24

\echo '═══════════════════════════════════════════════════════════════'
\echo 'H0 — VALIDACIÓN DE LÍNEA BASE DE AUTORIDAD'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''

-- ==========================================
-- 1. VERIFICAR SHADOW LOGS ACTIVOS
-- ==========================================

\echo '📊 1. Estado de Shadow Logs (D12-D15, D16-D19, D20-D22)'
\echo '─────────────────────────────────────────────────────────────'

SELECT
  decision_code,
  total_runs,
  divergences,
  matches,
  match_percentage,
  CASE
    WHEN total_runs = 0 THEN '❌ SIN RUNS'
    WHEN divergences > 0 THEN '⚠️ CON DIVERGENCIAS'
    ELSE '✅ OK'
  END as status
FROM shadow_decision_summary
WHERE decision_code IN (
  'D12_APPLY_SIGNER_SIGNATURE',
  'D13_START_SIGNATURE_WORKFLOW',
  'D14_REQUEST_DOCUMENT_CHANGES',
  'D15_RESPOND_TO_CHANGES',
  'D16_ACCEPT_NDA',
  'D17_ACCEPT_WORKFLOW_NDA',
  'D18_ACCEPT_INVITE_NDA',
  'D19_ACCEPT_SHARE_NDA',
  'D20_RECOVER_POLYGON',
  'D20_RECOVER_BITCOIN',
  'D21_CONFIRM_POLYGON',
  'D22_SUBMIT_BITCOIN',
  'D22_CONFIRM_BITCOIN'
)
ORDER BY decision_code;

\echo ''
\echo '─────────────────────────────────────────────────────────────'
\echo ''

-- ==========================================
-- 2. DISTINGUIR RUNS SIMULADOS VS REALES
-- ==========================================

\echo '🔍 2. Distribución Simulados vs Reales'
\echo '─────────────────────────────────────────────────────────────'

WITH run_classification AS (
  SELECT
    decision_code,
    COUNT(*) as total_runs,
    COUNT(*) FILTER (WHERE context ? 'scenario') as simulated_runs,
    COUNT(*) FILTER (WHERE NOT (context ? 'scenario')) as real_runs
  FROM shadow_decision_logs
  WHERE decision_code IN (
    'D12_APPLY_SIGNER_SIGNATURE',
    'D13_START_SIGNATURE_WORKFLOW',
    'D14_REQUEST_DOCUMENT_CHANGES',
    'D15_RESPOND_TO_CHANGES',
    'D16_ACCEPT_NDA',
    'D17_ACCEPT_WORKFLOW_NDA',
    'D18_ACCEPT_INVITE_NDA',
    'D19_ACCEPT_SHARE_NDA'
  )
  GROUP BY decision_code
)
SELECT
  decision_code,
  total_runs,
  simulated_runs,
  real_runs,
  CASE
    WHEN real_runs = 0 THEN '⏳ SOLO SIMULADOS'
    WHEN real_runs < 3 THEN '⚠️ POCOS REALES'
    ELSE '✅ SUFICIENTES'
  END as status
FROM run_classification
ORDER BY decision_code;

\echo ''
\echo '─────────────────────────────────────────────────────────────'
\echo ''

-- ==========================================
-- 3. VERIFICAR DIVERGENCIAS CRÍTICAS
-- ==========================================

\echo '🔴 3. Divergencias Detectadas'
\echo '─────────────────────────────────────────────────────────────'

SELECT
  decision_code,
  created_at,
  workflow_id,
  signer_id,
  legacy_decision,
  canonical_decision,
  context->>'scenario' as scenario
FROM shadow_decision_divergences
WHERE decision_code IN (
  'D12_APPLY_SIGNER_SIGNATURE',
  'D13_START_SIGNATURE_WORKFLOW',
  'D14_REQUEST_DOCUMENT_CHANGES',
  'D15_RESPOND_TO_CHANGES',
  'D16_ACCEPT_NDA',
  'D17_ACCEPT_WORKFLOW_NDA',
  'D18_ACCEPT_INVITE_NDA',
  'D19_ACCEPT_SHARE_NDA'
)
ORDER BY created_at DESC
LIMIT 10;

\echo ''
\echo '─────────────────────────────────────────────────────────────'
\echo ''

-- ==========================================
-- 4. VERIFICAR EXECUTOR ACTIVO
-- ==========================================

\echo '⚙️ 4. Estado del Executor'
\echo '─────────────────────────────────────────────────────────────'

WITH job_stats AS (
  SELECT
    COUNT(*) as total_jobs,
    COUNT(*) FILTER (WHERE j.status = 'succeeded') as succeeded,
    COUNT(*) FILTER (WHERE j.status = 'failed') as failed,
    COUNT(*) FILTER (WHERE j.status = 'running') as running,
    COUNT(*) FILTER (WHERE j.status = 'queued') as queued,
    MAX(j.created_at) as last_job_created
  FROM executor_jobs j
  WHERE j.created_at > NOW() - INTERVAL '7 days'
),
run_stats AS (
  SELECT
    COUNT(*) as total_runs,
    MAX(r.started_at) as last_run_started
  FROM executor_job_runs r
  WHERE r.started_at > NOW() - INTERVAL '7 days'
)
SELECT
  js.total_jobs,
  js.succeeded,
  js.failed,
  js.running,
  js.queued,
  rs.total_runs,
  js.last_job_created,
  rs.last_run_started,
  CASE
    WHEN js.total_jobs = 0 THEN '⚠️ SIN JOBS (verificar si executor corre en cloud)'
    WHEN rs.last_run_started > NOW() - INTERVAL '1 hour' THEN '✅ ACTIVO'
    WHEN rs.last_run_started > NOW() - INTERVAL '24 hours' THEN '⚠️ INACTIVO (< 24h)'
    WHEN rs.last_run_started IS NULL THEN '❌ NUNCA EJECUTADO'
    ELSE '❌ DETENIDO'
  END as status
FROM job_stats js
CROSS JOIN run_stats rs;

\echo ''
\echo '─────────────────────────────────────────────────────────────'
\echo ''

-- ==========================================
-- 5. ÚLTIMOS RUNS DEL EXECUTOR
-- ==========================================

\echo '📋 5. Últimos 5 Runs del Executor'
\echo '─────────────────────────────────────────────────────────────'

SELECT
  r.id,
  r.started_at,
  r.finished_at,
  r.status,
  r.duration_ms,
  j.type as job_type,
  j.entity_id
FROM executor_job_runs r
JOIN executor_jobs j ON r.job_id = j.id
WHERE r.started_at > NOW() - INTERVAL '7 days'
ORDER BY r.started_at DESC
LIMIT 5;

\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo 'RESUMEN H0'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''
\echo 'Checklist H0:'
\echo '  [ ] Shadow logs activos para D12–D15 (verificar sección 1)'
\echo '  [ ] Runs REALES (no simulados) registrados (verificar sección 2)'
\echo '  [ ] Comparación sin divergencias críticas (verificar sección 3)'
\echo '  [ ] Executor corriendo últimas 24h (verificar sección 4)'
\echo ''
\echo 'Acción requerida:'
\echo '  - Si "SOLO SIMULADOS" → Generar tráfico real de usuarios'
\echo '  - Si divergencias > 0 → Investigar causa raíz'
\echo '  - Si executor detenido → Verificar cron/trigger'
\echo ''
\echo '═══════════════════════════════════════════════════════════════'
