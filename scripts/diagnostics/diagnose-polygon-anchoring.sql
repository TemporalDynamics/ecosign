-- =====================================================================
-- DIAGNÓSTICO COMPLETO DE POLYGON ANCHORING
-- =====================================================================
-- Fecha: 2026-01-10
-- Propósito: Investigar por qué no se están creando anchors desde Dec 1
-- =====================================================================

-- =====================================================================
-- PASO 1: Verificar que los CRON JOBS estén configurados y activos
-- =====================================================================
SELECT
  '1. CRON JOBS CONFIGURATION' as check_name,
  jobname,
  schedule,
  active,
  jobid,
  CASE
    WHEN active THEN '✅ ACTIVO'
    ELSE '❌ INACTIVO'
  END as status
FROM cron.job
WHERE jobname IN ('process-polygon-anchors', 'process-bitcoin-anchors')
ORDER BY jobname;

-- =====================================================================
-- PASO 2: Ver historial de ejecuciones recientes
-- =====================================================================
SELECT
  '2. CRON EXECUTION HISTORY (Last 20)' as check_name,
  jobname,
  status,
  start_time,
  end_time,
  return_message,
  CASE
    WHEN status = 'succeeded' THEN '✅'
    WHEN status = 'failed' THEN '❌'
    ELSE '⚠️'
  END as icon
FROM cron.job_run_details
WHERE jobname = 'process-polygon-anchors'
ORDER BY start_time DESC
LIMIT 20;

-- =====================================================================
-- PASO 3: Documentos con polygon_status='pending' (deberían procesarse)
-- =====================================================================
SELECT
  '3. DOCUMENTS WITH polygon_status=pending' as check_name,
  COUNT(*) as total_pending_docs,
  MIN(created_at) as oldest_pending,
  MAX(created_at) as newest_pending,
  CASE
    WHEN COUNT(*) > 0 THEN '⚠️ HAY DOCUMENTOS PENDIENTES QUE NO SE PROCESARON'
    ELSE '✅ No hay pendientes'
  END as status
FROM user_documents
WHERE polygon_status = 'pending';

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
WHERE polygon_status = 'pending'
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================================
-- PASO 5: Verificar tabla anchors (deberían crearse registros)
-- =====================================================================
SELECT
  '5. ANCHORS TABLE STATUS' as check_name,
  COUNT(*) as total_anchors,
  COUNT(CASE WHEN chain_type = 'polygon' THEN 1 END) as polygon_anchors,
  COUNT(CASE WHEN anchor_status = 'pending' AND chain_type = 'polygon' THEN 1 END) as polygon_pending,
  COUNT(CASE WHEN anchor_status = 'confirmed' AND chain_type = 'polygon' THEN 1 END) as polygon_confirmed,
  COUNT(CASE WHEN anchor_status = 'failed' AND chain_type = 'polygon' THEN 1 END) as polygon_failed,
  MAX(CASE WHEN chain_type = 'polygon' THEN created_at END) as last_polygon_anchor_created
FROM anchors;

-- =====================================================================
-- PASO 6: Últimos anchors de Polygon creados
-- =====================================================================
SELECT
  '6. LAST POLYGON ANCHORS' as check_name,
  id,
  document_id,
  chain_type,
  anchor_status,
  polygon_status,
  tx_hash,
  created_at,
  confirmed_at
FROM anchors
WHERE chain_type = 'polygon'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================================
-- PASO 7: Documentos recientes creados (últimos 30 días)
-- =====================================================================
SELECT
  '7. RECENT DOCUMENTS (Last 30 days)' as check_name,
  DATE(created_at) as date,
  COUNT(*) as total_docs,
  COUNT(CASE WHEN polygon_status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN polygon_status = 'confirmed' THEN 1 END) as confirmed,
  COUNT(CASE WHEN polygon_status IS NULL THEN 1 END) as null_status,
  COUNT(CASE WHEN polygon_status = 'failed' THEN 1 END) as failed
FROM user_documents
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- =====================================================================
-- PASO 8: Verificar configuración de forensicConfig
-- =====================================================================
SELECT
  '8. FORENSIC CONFIG IN RECENT DOCS' as check_name,
  id,
  filename,
  eco_data->'metadata'->>'forensicEnabled' as forensic_enabled,
  eco_data->'metadata'->>'usePolygonAnchor' as use_polygon_anchor,
  polygon_status,
  created_at
FROM user_documents
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================================
-- PASO 9: Verificar si hay errores en Edge Function logs (si disponible)
-- =====================================================================
-- NOTA: Esto requiere acceso a logs de Supabase Dashboard
-- Ver en: Dashboard → Edge Functions → process-polygon-anchors → Logs

-- =====================================================================
-- PASO 10: Verificar que la Edge Function existe y está deployada
-- =====================================================================
-- NOTA: Ejecutar desde terminal:
-- supabase functions list --project-ref uiyojopjbhooxrmamaiw

-- =====================================================================
-- RESUMEN DE DIAGNÓSTICO
-- =====================================================================
SELECT
  'DIAGNOSTIC SUMMARY' as summary,
  (SELECT COUNT(*) FROM cron.job WHERE jobname = 'process-polygon-anchors' AND active = true) as cron_active,
  (SELECT COUNT(*) FROM user_documents WHERE polygon_status = 'pending') as docs_pending,
  (SELECT COUNT(*) FROM anchors WHERE chain_type = 'polygon' AND anchor_status = 'pending') as anchors_pending,
  (SELECT COUNT(*) FROM anchors WHERE chain_type = 'polygon' AND created_at > NOW() - INTERVAL '30 days') as anchors_last_30d,
  CASE
    WHEN (SELECT COUNT(*) FROM cron.job WHERE jobname = 'process-polygon-anchors' AND active = true) = 0
      THEN '❌ CRON NOT CONFIGURED'
    WHEN (SELECT COUNT(*) FROM user_documents WHERE polygon_status = 'pending') > 0
      THEN '⚠️ DOCUMENTS NOT BEING PROCESSED'
    ELSE '✅ LOOKS OK'
  END as diagnosis;

-- =====================================================================
-- COMANDOS PARA EJECUTAR EN TERMINAL (después de este diagnóstico)
-- =====================================================================
/*

# Ver logs de process-polygon-anchors
supabase functions logs process-polygon-anchors --project-ref uiyojopjbhooxrmamaiw --tail 100

# Verificar que la función está deployada
supabase functions list --project-ref uiyojopjbhooxrmamaiw

# Invocar manualmente para testing
supabase functions invoke process-polygon-anchors --project-ref uiyojopjbhooxrmamaiw

# Ver configuración de variables de entorno
supabase secrets list --project-ref uiyojopjbhooxrmamaiw

*/
