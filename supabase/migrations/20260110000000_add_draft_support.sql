-- ========================================
-- DRAFT OPERATIONS - EcoSign P0
-- Fecha: 2026-01-10
-- Contrato: DRAFT_OPERATION_RULES.md
-- ========================================
-- Este esquema extiende operations para soportar drafts:
-- - operations.status incluye 'draft'
-- - operation_documents soporta documentos no protegidos
-- - draft_file_ref para referencias cifradas temporales
-- - draft_metadata para metadata de preparación
-- ========================================

-- ========================================
-- 1. MODIFICAR operations.status
-- ========================================
-- Agregar 'draft' como estado válido

-- Primero, eliminar el constraint existente
ALTER TABLE operations
  DROP CONSTRAINT IF EXISTS operations_status_check;

-- Crear nuevo constraint con 'draft'
ALTER TABLE operations
  ADD CONSTRAINT operations_status_check
    CHECK (status IN ('draft', 'active', 'closed', 'archived'));

-- Comentarios actualizados
COMMENT ON COLUMN operations.status IS 'Estado: draft (preparación), active (en curso), closed (finalizada), archived (fallida/cancelada)';

-- ========================================
-- 2. MODIFICAR operation_documents
-- ========================================
-- Permitir drafts sin document_entity_id (documentos no protegidos)

-- Hacer document_entity_id nullable
ALTER TABLE operation_documents
  ALTER COLUMN document_entity_id DROP NOT NULL;

-- Agregar columnas para draft support
ALTER TABLE operation_documents
  ADD COLUMN IF NOT EXISTS draft_file_ref TEXT,
  ADD COLUMN IF NOT EXISTS draft_metadata JSONB DEFAULT '{}'::jsonb;

-- Comentarios
COMMENT ON COLUMN operation_documents.document_entity_id IS 'ID del documento protegido (NULL si aún es draft)';
COMMENT ON COLUMN operation_documents.draft_file_ref IS 'Referencia cifrada al archivo temporal (solo para drafts)';
COMMENT ON COLUMN operation_documents.draft_metadata IS 'Metadata de preparación: posiciones, orden, notas (solo para drafts)';

-- ========================================
-- 3. CONSTRAINTS DE INTEGRIDAD
-- ========================================

-- Regla: un draft debe tener draft_file_ref O document_entity_id
ALTER TABLE operation_documents
  ADD CONSTRAINT operation_documents_draft_or_protected
    CHECK (
      (document_entity_id IS NOT NULL AND draft_file_ref IS NULL) OR
      (document_entity_id IS NULL AND draft_file_ref IS NOT NULL)
    );

-- Regla: draft_metadata solo válido si draft_file_ref existe
ALTER TABLE operation_documents
  ADD CONSTRAINT operation_documents_draft_metadata_valid
    CHECK (
      draft_file_ref IS NOT NULL OR
      draft_metadata = '{}'::jsonb
    );

COMMENT ON CONSTRAINT operation_documents_draft_or_protected
  ON operation_documents IS 'Draft debe tener file_ref O document_id (no ambos)';

-- ========================================
-- 4. ÍNDICES PARA DRAFTS
-- ========================================

-- Índice para buscar drafts de un usuario
CREATE INDEX IF NOT EXISTS idx_operations_owner_draft
  ON operations (owner_id)
  WHERE status = 'draft';

-- Índice para drafts en operation_documents
CREATE INDEX IF NOT EXISTS idx_operation_documents_drafts
  ON operation_documents (operation_id, added_at DESC)
  WHERE draft_file_ref IS NOT NULL;

-- ========================================
-- 5. FUNCIONES AUXILIARES
-- ========================================

-- Función para contar drafts pendientes de un usuario
CREATE OR REPLACE FUNCTION count_user_drafts(user_id_param UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM operations
  WHERE owner_id = user_id_param
    AND status = 'draft';
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION count_user_drafts IS 'Cuenta operaciones en draft de un usuario';

-- Función para validar si una operación es draft
CREATE OR REPLACE FUNCTION is_draft_operation(operation_id_param UUID)
RETURNS BOOLEAN AS $$
  SELECT status = 'draft'
  FROM operations
  WHERE id = operation_id_param;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION is_draft_operation IS 'Verifica si una operación está en draft';

-- ========================================
-- 6. TRIGGER PARA LIMPIAR DRAFTS AL PROTEGER
-- ========================================

-- Cuando se protege un draft (document_entity_id se llena),
-- limpiar draft_file_ref y draft_metadata automáticamente

CREATE OR REPLACE FUNCTION cleanup_draft_on_protect()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se está agregando document_entity_id, limpiar draft fields
  IF NEW.document_entity_id IS NOT NULL AND OLD.document_entity_id IS NULL THEN
    NEW.draft_file_ref := NULL;
    NEW.draft_metadata := '{}'::jsonb;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_draft_on_protect
  BEFORE UPDATE ON operation_documents
  FOR EACH ROW
  WHEN (NEW.document_entity_id IS NOT NULL AND OLD.document_entity_id IS NULL)
  EXECUTE FUNCTION cleanup_draft_on_protect();

COMMENT ON FUNCTION cleanup_draft_on_protect IS 'Limpia draft_file_ref y draft_metadata al proteger un draft';

-- ========================================
-- 7. RLS POLICIES PARA DRAFTS
-- ========================================

-- Las policies existentes ya cubren drafts (filtran por owner_id)
-- No se necesitan policies adicionales

-- ========================================
-- 8. VALIDACIÓN
-- ========================================

-- Verificar que los cambios se aplicaron correctamente
DO $$
BEGIN
  -- Verificar que 'draft' es un estado válido
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'operations_status_check'
      AND conrelid = 'operations'::regclass
      AND pg_get_constraintdef(oid) LIKE '%draft%'
  ) THEN
    RAISE EXCEPTION 'Draft status not added to operations.status check';
  END IF;

  -- Verificar que las nuevas columnas existen
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operation_documents'
      AND column_name = 'draft_file_ref'
  ) THEN
    RAISE EXCEPTION 'draft_file_ref column not added to operation_documents';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operation_documents'
      AND column_name = 'draft_metadata'
  ) THEN
    RAISE EXCEPTION 'draft_metadata column not added to operation_documents';
  END IF;

  -- Verificar que document_entity_id ahora es nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operation_documents'
      AND column_name = 'document_entity_id'
      AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'document_entity_id should be nullable for drafts';
  END IF;

  RAISE NOTICE 'Draft support added successfully to operations schema';
END;
$$;

-- ========================================
-- 9. EJEMPLO DE USO (COMENTARIO)
-- ========================================

-- Crear operación draft:
-- INSERT INTO operations (owner_id, name, status)
-- VALUES (auth.uid(), 'Venta Propiedad X', 'draft');

-- Agregar archivo draft:
-- INSERT INTO operation_documents (operation_id, draft_file_ref, draft_metadata)
-- VALUES (
--   '{operation_id}',
--   'encrypted:storage/path/to/file',
--   '{"filename": "contrato.pdf", "size": 123456, "positions": {...}}'::jsonb
-- );

-- Proteger draft (mover a document_entities):
-- UPDATE operation_documents
-- SET document_entity_id = '{new_document_entity_id}'
-- WHERE id = '{operation_document_id}';
-- -- Trigger limpiará draft_file_ref y draft_metadata automáticamente

-- Cambiar operación de draft a active:
-- UPDATE operations
-- SET status = 'active'
-- WHERE id = '{operation_id}' AND status = 'draft';

-- ========================================
-- FIN DE MIGRACIÓN
-- ========================================
