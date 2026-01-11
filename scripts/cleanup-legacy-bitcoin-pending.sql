-- =====================================================================
-- CLEANUP: Documentos legacy con bitcoin_status='pending'
-- =====================================================================
-- Fecha: 2026-01-11
-- Propósito: Limpiar documentos pendientes legacy (Bitcoin/OpenTimestamps)
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
WHERE bitcoin_status = 'pending'
ORDER BY created_at DESC;

-- =====================================================================
-- PASO 2: Actualizar documentos legacy a NULL (skip anchoring)
-- =====================================================================

-- Marcar como NULL (no se intentará anclar)
UPDATE user_documents
SET
  bitcoin_status = NULL,
  updated_at = NOW()
WHERE bitcoin_status = 'pending'
  AND created_at < '2026-01-10'::timestamp; -- Solo legacy, no documentos de hoy

-- =====================================================================
-- PASO 3: Verificar cleanup
-- =====================================================================
SELECT
  COUNT(*) FILTER (WHERE bitcoin_status = 'pending') as still_pending,
  COUNT(*) FILTER (WHERE bitcoin_status IS NULL AND polygon_status IS NULL) as both_nullified,
  COUNT(*) as total
FROM user_documents;

-- =====================================================================
-- RESULTADO ESPERADO
-- =====================================================================
-- still_pending: 0 (si no protegiste documentos hoy con bitcoin)
-- both_nullified: documentos legacy sin ningún anchor pendiente

-- =====================================================================
-- ROLLBACK (si algo salió mal)
-- =====================================================================
/*
-- Solo descomenta si necesitas revertir
UPDATE user_documents
SET bitcoin_status = 'pending'
WHERE bitcoin_status IS NULL
  AND created_at < '2026-01-10';
*/
