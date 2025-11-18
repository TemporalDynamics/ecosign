-- =====================================================
-- Migration: Ajustes Finales de Seguridad por Defecto
-- =====================================================
-- Implementa las decisiones de producto:
-- 1. Seguridad máxima por defecto (Login + NDA)
-- 2. Todos pueden firmar y solicitar cambios
-- 3. Quick Access desactiva toda seguridad

-- Actualizar valores por defecto de workflow_signers
-- SEGURIDAD MÁXIMA POR DEFECTO
ALTER TABLE workflow_signers
  ALTER COLUMN require_login SET DEFAULT true,
  ALTER COLUMN require_nda SET DEFAULT true,
  ALTER COLUMN quick_access SET DEFAULT false;

-- Agregar comentarios de documentación
COMMENT ON COLUMN workflow_signers.require_login IS
  'Por defecto TRUE (seguridad máxima). Solo FALSE si quick_access = true';

COMMENT ON COLUMN workflow_signers.require_nda IS
  'Por defecto TRUE (seguridad máxima). Solo FALSE si quick_access = true';

COMMENT ON COLUMN workflow_signers.quick_access IS
  'Si TRUE, desactiva require_login y require_nda para acceso rápido';

-- Función auxiliar: Validar que quick_access desactive seguridad
CREATE OR REPLACE FUNCTION validate_signer_security()
RETURNS TRIGGER AS $$
BEGIN
  -- Si quick_access está ON, forzar seguridad OFF
  IF NEW.quick_access = true THEN
    NEW.require_login := false;
    NEW.require_nda := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar configuración de seguridad
DROP TRIGGER IF EXISTS trigger_validate_signer_security ON workflow_signers;
CREATE TRIGGER trigger_validate_signer_security
  BEFORE INSERT OR UPDATE ON workflow_signers
  FOR EACH ROW
  EXECUTE FUNCTION validate_signer_security();

-- Agregar check constraint para consistencia
ALTER TABLE workflow_signers
  DROP CONSTRAINT IF EXISTS check_quick_access_consistency;

ALTER TABLE workflow_signers
  ADD CONSTRAINT check_quick_access_consistency CHECK (
    (quick_access = false) OR
    (quick_access = true AND require_login = false AND require_nda = false)
  );

COMMENT ON CONSTRAINT check_quick_access_consistency ON workflow_signers IS
  'Garantiza que quick_access=true implica require_login=false y require_nda=false';

-- =====================================================
-- PERMISOS UNIVERSALES
-- =====================================================
-- Todos los firmantes pueden firmar Y solicitar cambios
-- No hay campo "permisos" porque todos tienen los mismos

COMMENT ON TABLE workflow_signers IS
  'Firmantes en orden secuencial. TODOS pueden firmar y solicitar cambios por diseño.';

-- =====================================================
-- NDA: CHECKBOX LEGAL, NO DOCUMENTO
-- =====================================================

COMMENT ON COLUMN workflow_signers.require_nda IS
  'NDA = checkbox legal trackeado en workflow_signatures, no un documento separado';

-- Agregar tracking de NDA en workflow_signatures
ALTER TABLE workflow_signatures
  ADD COLUMN IF NOT EXISTS nda_accepted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS nda_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nda_ip_address TEXT,
  ADD COLUMN IF NOT EXISTS nda_fingerprint JSONB;

COMMENT ON COLUMN workflow_signatures.nda_accepted IS
  'TRUE si el firmante aceptó el checkbox NDA antes de firmar';

COMMENT ON COLUMN workflow_signatures.nda_fingerprint IS
  'Browser fingerprint + metadatos cuando aceptó NDA (no-repudiación)';

-- =====================================================
-- CONFIGURACIÓN FORENSE POR DEFECTO
-- =====================================================

-- Actualizar valores por defecto de forensic_config
ALTER TABLE signature_workflows
  ALTER COLUMN forensic_config SET DEFAULT '{
    "rfc3161": true,
    "polygon": true,
    "bitcoin": false
  }'::jsonb;

COMMENT ON COLUMN signature_workflows.forensic_config IS
  'Blindaje forense por defecto: RFC3161 + Polygon. Bitcoin opcional (costo/tiempo).';

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_signatures_nda ON workflow_signatures(nda_accepted)
  WHERE nda_accepted = true;

CREATE INDEX IF NOT EXISTS idx_signers_quick_access ON workflow_signers(quick_access)
  WHERE quick_access = true;

-- =====================================================
-- RESUMEN DE DECISIONES DE PRODUCTO
-- =====================================================
--
-- ✅ Seguridad por defecto: require_login=true, require_nda=true
-- ✅ Quick Access: un solo switch que desactiva toda seguridad
-- ✅ Todos pueden firmar y solicitar cambios (sin campo de permisos)
-- ✅ NDA = checkbox legal trackeado, no documento separado
-- ✅ VerifyTracker siempre activo (IP, UA, fingerprint)
-- ✅ Triple Anchoring: RFC3161 + Polygon por defecto
-- =====================================================
