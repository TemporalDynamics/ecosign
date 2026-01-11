-- =====================================================================
-- DIAGNÓSTICO COMPLETO DE BITCOIN ANCHORING
-- =====================================================================
-- Fecha: 2026-01-11
-- Propósito: Investigar estado de Bitcoin/OpenTimestamps anchoring
-- =====================================================================

-- =====================================================================
-- PASO 1: Verificar que el CRON JOB está configurado y activo
-- =====================================================================
SELECT
  '1. CRON JOB CONFIGURATION' as check_name,
  jobname,
  schedule,
  active,
  jobid,
  CASE
    WHEN active THEN '✅ ACTIVO'
    ELSE '❌ INACTIVO'
  END as status
FROM cron.job
WHERE jobname = 'process-bitcoin-anchors'
ORDER BY jobname;

-- =====================================================================
-- PASO 2: Ver historial de ejecuciones recientes
-- =====================================================================
SELECT
  '2. CRON EXECUTION HISTORY (Last 20)' as check_name,
  jobid,
  status,
  return_message,
  start_time,
  end_time,
  CASE
    WHEN status = 'succeeded' THEN '✅'
    WHEN status = 'failed' THEN '❌'
    ELSE '⚠️'
  END as icon
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-bitcoin-anchors')
ORDER BY runid DESC
LIMIT 20;

-- =====================================================================
-- PASO 3: Documentos con bitcoin_status='pending' (deberían procesarse)
-- =====================================================================
SELECT
  '3. DOCUMENTS WITH bitcoin_status=pending' as check_name,
  COUNT(*) as total_pending_docs,
  MIN(created_at) as oldest_pending,
  MAX(created_at) as newest_pending,
  CASE
    WHEN COUNT(*) > 0 THEN '⚠️ HAY DOCUMENTOS PENDIENTES QUE NO SE PROCESARON'
    ELSE '✅ No hay pendientes'
  END as status
FROM user_documents
WHERE bitcoin_status = 'pending';

-- =====================================================================
-- PASO 4: Detalle de documentos pendientes
-- =====================================================================
SELECT
  '4. PENDING DOCUMENTS DETAIL' as check_name,
  id,
  filename,
  polygon_status,
  bitcoin_status,
  protection_level,
  created_at,
  AGE(NOW(), created_at) as time_pending
FROM user_documents
WHERE bitcoin_status = 'pending'
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================================
-- PASO 5: Verificar tabla anchors para Bitcoin
-- =====================================================================
SELECT
  '5. ANCHORS TABLE - BITCOIN STATUS' as check_name,
  COUNT(*) as total_anchors,
  COUNT(CASE WHEN blockchain = 'bitcoin' THEN 1 END) as bitcoin_anchors,
  COUNT(CASE WHEN blockchain = 'bitcoin' AND anchor_status = 'pending' THEN 1 END) as bitcoin_pending,
  COUNT(CASE WHEN blockchain = 'bitcoin' AND anchor_status = 'confirmed' THEN 1 END) as bitcoin_confirmed,
  COUNT(CASE WHEN blockchain = 'bitcoin' AND anchor_status = 'failed' THEN 1 END) as bitcoin_failed,
  MAX(CASE WHEN blockchain = 'bitcoin' THEN created_at END) as last_bitcoin_anchor_created
FROM anchors;

-- =====================================================================
-- PASO 6: Últimos anchors de Bitcoin creados
-- =====================================================================
SELECT
  '6. LAST BITCOIN ANCHORS' as check_name,
  id,
  document_id,
  blockchain,
  anchor_status,
  bitcoin_status,
  ots_info,
  created_at,
  confirmed_at
FROM anchors
WHERE blockchain = 'bitcoin'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================================
-- PASO 7: Documentos recientes con bitcoin habilitado (últimos 30 días)
-- =====================================================================
SELECT
  '7. RECENT DOCUMENTS - BITCOIN (Last 30 days)' as check_name,
  DATE(created_at) as date,
  COUNT(*) as total_docs,
  COUNT(CASE WHEN bitcoin_status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN bitcoin_status = 'confirmed' THEN 1 END) as confirmed,
  COUNT(CASE WHEN bitcoin_status IS NULL THEN 1 END) as null_status,
  COUNT(CASE WHEN bitcoin_status = 'failed' THEN 1 END) as failed
FROM user_documents
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- =====================================================================
-- PASO 8: Verificar configuración de forensicConfig para Bitcoin
-- =====================================================================
SELECT
  '8. FORENSIC CONFIG - BITCOIN IN RECENT DOCS' as check_name,
  id,
  filename,
  eco_data->'metadata'->>'forensicEnabled' as forensic_enabled,
  eco_data->'metadata'->>'useBitcoinAnchor' as use_bitcoin_anchor,
  bitcoin_status,
  created_at
FROM user_documents
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================================
-- RESUMEN DE DIAGNÓSTICO
-- =====================================================================
SELECT
  'DIAGNOSTIC SUMMARY - BITCOIN' as summary,
  (SELECT COUNT(*) FROM cron.job WHERE jobname = 'process-bitcoin-anchors' AND active = true) as cron_active,
  (SELECT COUNT(*) FROM user_documents WHERE bitcoin_status = 'pending') as docs_pending,
  (SELECT COUNT(*) FROM anchors WHERE blockchain = 'bitcoin' AND anchor_status = 'pending') as anchors_pending,
  (SELECT COUNT(*) FROM anchors WHERE blockchain = 'bitcoin' AND created_at > NOW() - INTERVAL '30 days') as anchors_last_30d,
  CASE
    WHEN (SELECT COUNT(*) FROM cron.job WHERE jobname = 'process-bitcoin-anchors' AND active = true) = 0
      THEN '❌ CRON NOT CONFIGURED'
    WHEN (SELECT COUNT(*) FROM user_documents WHERE bitcoin_status = 'pending') > 0
      THEN '⚠️ DOCUMENTS NOT BEING PROCESSED'
    ELSE '✅ LOOKS OK'
  END as diagnosis;
