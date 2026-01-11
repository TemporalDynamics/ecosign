-- =====================================================================
-- CLEANUP: Documentos legacy con polygon_status='pending'
-- =====================================================================
-- Fecha: 2026-01-11
-- Propósito: Limpiar 65 documentos pendientes legacy (Dec 18 - Jan 9)
--           No hay usuarios reales, safe to skip
-- =====================================================================

-- PASO 1: Ver qué documentos vamos a limpiar
SELECT
  id,
  filename,
  polygon_status,
  bitcoin_status,
  protection_level,
  created_at,
  AGE(NOW(), created_at) as age
FROM user_documents
WHERE polygon_status = 'pending'
ORDER BY created_at DESC;

-- =====================================================================
-- PASO 2: Actualizar documentos legacy a NULL (skip anchoring)
-- =====================================================================

-- Opción A: Marcar como NULL (no se intentará anclar)
UPDATE user_documents
SET
  polygon_status = NULL,
  bitcoin_status = NULL,
  updated_at = NOW()
WHERE polygon_status = 'pending'
  AND created_at < '2026-01-10'::timestamp; -- Solo legacy, no documentos de hoy

-- =====================================================================
-- PASO 3: Verificar cleanup
-- =====================================================================
SELECT
  COUNT(*) FILTER (WHERE polygon_status = 'pending') as still_pending,
  COUNT(*) FILTER (WHERE polygon_status IS NULL) as nullified,
  COUNT(*) as total
FROM user_documents;

-- =====================================================================
-- RESULTADO ESPERADO
-- =====================================================================
-- still_pending: 0 (si no protegiste documentos hoy con polygon)
-- nullified: debería haber incrementado en ~65

-- =====================================================================
-- ROLLBACK (si algo salió mal)
-- =====================================================================
/*
-- Solo descomenta si necesitas revertir
UPDATE user_documents
SET polygon_status = 'pending'
WHERE polygon_status IS NULL
  AND created_at BETWEEN '2025-12-18' AND '2026-01-09';
*/
