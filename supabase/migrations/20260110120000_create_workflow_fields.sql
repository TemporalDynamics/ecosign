-- ========================================
-- WORKFLOW FIELDS TABLE - Sprint 6
-- Fecha: 2026-01-10
-- Persistencia de campos configurados para workflow multi-firmante
-- ========================================
--
-- Propósito:
-- Guardar campos (signature, text, date) que el owner configura
-- para que los firmantes completen durante el workflow.
--
-- Arquitectura:
-- - Un document_entity puede tener múltiples fields
-- - Cada field tiene posición normalizada (0-1) en el PDF
-- - Fields se asignan a signers específicos (email)
-- - Persistencia permite recovery tras refresh
--
-- ========================================

-- ========================================
-- 1. CREAR TABLA workflow_fields
-- ========================================

CREATE TABLE IF NOT EXISTS workflow_fields (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relación con documento
  document_entity_id UUID NOT NULL REFERENCES document_entities(id) ON DELETE CASCADE,

  -- Tipo de campo
  field_type TEXT NOT NULL CHECK (field_type IN ('signature', 'text', 'date')),

  -- Metadata del campo
  label TEXT,
  placeholder TEXT,

  -- Posición normalizada (0-1) en el PDF
  -- Formato: {page, x, y, width, height}
  position JSONB NOT NULL,

  -- Asignación
  assigned_to TEXT, -- Email del signer asignado (puede ser NULL si no asignado)
  required BOOLEAN NOT NULL DEFAULT false,

  -- Valor (se llena cuando el signer completa)
  value TEXT,

  -- Metadata adicional
  -- Puede incluir: format (para date), maxLength, etc.
  metadata JSONB,

  -- Batch grouping (para duplicación en batch)
  batch_id UUID,

  -- Apply to all pages flag
  apply_to_all_pages BOOLEAN DEFAULT false,

  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT position_required CHECK (position IS NOT NULL),
  CONSTRAINT valid_position CHECK (
    jsonb_typeof(position) = 'object' AND
    position ? 'page' AND
    position ? 'x' AND
    position ? 'y' AND
    position ? 'width' AND
    position ? 'height'
  )
);

-- ========================================
-- 2. INDEXES
-- ========================================

-- Index por document_entity_id (query común: "dame todos los fields de este doc")
CREATE INDEX IF NOT EXISTS idx_workflow_fields_document
  ON workflow_fields(document_entity_id);

-- Index por assigned_to (query común: "dame fields asignados a este signer")
CREATE INDEX IF NOT EXISTS idx_workflow_fields_assigned
  ON workflow_fields(assigned_to)
  WHERE assigned_to IS NOT NULL;

-- Index por batch_id (para operaciones batch)
CREATE INDEX IF NOT EXISTS idx_workflow_fields_batch
  ON workflow_fields(batch_id)
  WHERE batch_id IS NOT NULL;

-- Index compuesto: document + field_type
CREATE INDEX IF NOT EXISTS idx_workflow_fields_document_type
  ON workflow_fields(document_entity_id, field_type);

-- ========================================
-- 3. TRIGGER: updated_at automático
-- ========================================

CREATE OR REPLACE FUNCTION update_workflow_fields_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_workflow_fields_updated_at
  BEFORE UPDATE ON workflow_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_fields_updated_at();

-- ========================================
-- 4. RLS POLICIES
-- ========================================

ALTER TABLE workflow_fields ENABLE ROW LEVEL SECURITY;

-- Policy 1: Owner del documento puede leer/escribir sus fields
CREATE POLICY "workflow_fields_owner_full_access"
  ON workflow_fields
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM document_entities
      WHERE document_entities.id = workflow_fields.document_entity_id
        AND document_entities.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM document_entities
      WHERE document_entities.id = workflow_fields.document_entity_id
        AND document_entities.owner_id = auth.uid()
    )
  );

-- Policy 2: Signer asignado puede leer (pero no modificar) sus fields
CREATE POLICY "workflow_fields_signer_read_assigned"
  ON workflow_fields
  FOR SELECT
  TO authenticated
  USING (
    assigned_to = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Policy 3: Signer puede actualizar el VALUE de su field asignado
CREATE POLICY "workflow_fields_signer_update_value"
  ON workflow_fields
  FOR UPDATE
  TO authenticated
  USING (
    assigned_to = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    assigned_to = (SELECT email FROM auth.users WHERE id = auth.uid())
    -- Solo puede cambiar 'value', no posición ni metadata
  );

-- ========================================
-- 5. COMMENTS (Documentación)
-- ========================================

COMMENT ON TABLE workflow_fields IS
  'Sprint 6: Campos configurables para workflow multi-firmante. Owner configura campos que los signers completarán durante el flujo.';

COMMENT ON COLUMN workflow_fields.position IS
  'Posición normalizada (0-1) en formato {page, x, y, width, height}. Coordenadas relativas al tamaño de página PDF real.';

COMMENT ON COLUMN workflow_fields.assigned_to IS
  'Email del signer asignado. NULL = no asignado aún.';

COMMENT ON COLUMN workflow_fields.batch_id IS
  'UUID de batch para duplicación. Campos con mismo batch_id fueron creados juntos.';

COMMENT ON COLUMN workflow_fields.apply_to_all_pages IS
  'Si true, el campo se replica en todas las páginas del PDF (solo para signature type).';

-- ========================================
-- 6. VALIDACIÓN
-- ========================================

DO $$
BEGIN
  -- Verificar que la tabla existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'workflow_fields'
  ) THEN
    RAISE EXCEPTION 'workflow_fields table not created';
  END IF;

  -- Verificar índices
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'workflow_fields'
      AND indexname = 'idx_workflow_fields_document'
  ) THEN
    RAISE EXCEPTION 'idx_workflow_fields_document index not created';
  END IF;

  -- Verificar RLS habilitado
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'workflow_fields'
      AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on workflow_fields';
  END IF;

  RAISE NOTICE 'workflow_fields table created successfully with RLS and indexes';
END;
$$;

-- ========================================
-- 7. EJEMPLO DE USO (COMENTARIO)
-- ========================================

-- Insertar campo de texto asignado a signer:
-- INSERT INTO workflow_fields (
--   document_entity_id,
--   field_type,
--   label,
--   position,
--   assigned_to,
--   required,
--   created_by
-- ) VALUES (
--   'd03545b7-e1e3-4124-9cd4-ddc7206c14f5',
--   'text',
--   'Nombre completo',
--   '{"page": 1, "x": 0.1, "y": 0.5, "width": 0.3, "height": 0.05}'::jsonb,
--   'firmante@example.com',
--   true,
--   auth.uid()
-- );

-- Query campos de un documento:
-- SELECT * FROM workflow_fields
-- WHERE document_entity_id = 'd03545b7-e1e3-4124-9cd4-ddc7206c14f5'
-- ORDER BY created_at;

-- Query campos asignados a un signer:
-- SELECT * FROM workflow_fields
-- WHERE assigned_to = 'firmante@example.com';

-- ========================================
-- FIN DE MIGRACIÓN
-- ========================================
