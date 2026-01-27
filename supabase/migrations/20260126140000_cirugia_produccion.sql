-- ============================================
-- CIRUGÍA DE PRODUCCIÓN - Normalización completa
-- ============================================
-- Fecha: 2026-01-26
-- Objetivo: Dejar producción en estado consistente
-- Estado: DRAFT - ajustar después del audit
-- ============================================

BEGIN;

-- ============================================
-- PASO 1: Deshabilitar triggers legacy
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'PASO 1: Deshabilitando triggers legacy...';
END $$;

-- Deshabilitar notify_signer_link (genera links con hash en vez de token)
DROP TRIGGER IF EXISTS notify_signer_link ON workflow_signers;

-- Otros triggers legacy si existen
DROP TRIGGER IF EXISTS notify_workflow_created ON signature_workflows;
DROP TRIGGER IF EXISTS auto_notify_signers ON workflow_signers;

DO $$
BEGIN
  RAISE NOTICE 'Triggers legacy deshabilitados ✓';
END $$;

-- ============================================
-- PASO 2: Limpiar notificaciones inválidas
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'PASO 2: Limpiando notificaciones con links inválidos...';
END $$;

-- Borrar notificaciones pendientes con links viejos (hash en vez de token)
DELETE FROM workflow_notifications
WHERE delivery_status = 'pending'
  AND body_html LIKE '%/sign/%'
  AND created_at < NOW() - INTERVAL '1 hour';

DO $$
BEGIN
  RAISE NOTICE 'Notificaciones inválidas eliminadas ✓';
END $$;

-- ============================================
-- PASO 3: Marcar workflows rotos como inválidos
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'PASO 3: Invalidando workflows sin documento...';
END $$;

-- Workflows sin document_entity_id son inválidos
UPDATE signature_workflows
SET status = 'cancelled',
    updated_at = NOW()
WHERE document_entity_id IS NULL
  AND status NOT IN ('cancelled', 'completed');

DO $$
BEGIN
  RAISE NOTICE 'Workflows rotos marcados como cancelled ✓';
END $$;

-- ============================================
-- PASO 4: Actualizar signers de workflows cancelados
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'PASO 4: Cancelando signers de workflows inválidos...';
END $$;

UPDATE workflow_signers ws
SET status = 'cancelled',
    token_revoked_at = NOW()
WHERE ws.workflow_id IN (
  SELECT id FROM signature_workflows WHERE status = 'cancelled'
)
AND ws.status NOT IN ('cancelled', 'signed');

DO $$
BEGIN
  RAISE NOTICE 'Signers cancelados ✓';
END $$;

-- ============================================
-- PASO 5: Agregar constraints faltantes (comentados por si fallan)
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'PASO 5: Agregando constraints...';
END $$;

-- Hacer document_entity_id NOT NULL en workflows ACTIVOS
-- (no aplicamos a históricos cancelados)
-- ALTER TABLE signature_workflows
--   ADD CONSTRAINT workflows_must_have_document
--   CHECK (status = 'cancelled' OR document_entity_id IS NOT NULL);

-- Asegurar que delivery_mode tenga valor
ALTER TABLE signature_workflows
  ALTER COLUMN delivery_mode SET DEFAULT 'email';

UPDATE signature_workflows
SET delivery_mode = 'email'
WHERE delivery_mode IS NULL;

DO $$
BEGIN
  RAISE NOTICE 'Constraints agregados ✓';
  RAISE NOTICE '';
  RAISE NOTICE '=== RESUMEN DE CIRUGÍA ===';
END $$;

-- ============================================
-- PASO 6: Resumen final
-- ============================================
SELECT
  'Workflows activos' as item,
  COUNT(*) as cantidad
FROM signature_workflows
WHERE status = 'active'
UNION ALL
SELECT
  'Workflows cancelados (limpieza)',
  COUNT(*)
FROM signature_workflows
WHERE status = 'cancelled' AND updated_at > NOW() - INTERVAL '5 minutes'
UNION ALL
SELECT
  'Signers ready_to_sign',
  COUNT(*)
FROM workflow_signers
WHERE status = 'ready_to_sign'
UNION ALL
SELECT
  'Notificaciones pendientes válidas',
  COUNT(*)
FROM workflow_notifications
WHERE delivery_status = 'pending';

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ CIRUGÍA COMPLETADA';
END $$;

COMMIT;

-- ============================================
-- ROLLBACK EN CASO DE ERROR
-- ============================================
-- Si algo falla, toda la transacción se revierte automáticamente
