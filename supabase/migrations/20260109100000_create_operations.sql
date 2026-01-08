-- ========================================
-- OPERACIONES - EcoSign P0
-- Fecha: 2026-01-09
-- ========================================
-- Este esquema implementa el contrato P0 Demo Broker:
-- - Operaciones como carpetas/contenedores lógicos
-- - Estados: active, closed, archived
-- - Nada se borra, solo se organiza
-- - Pueden existir operaciones vacías
-- - Documentos pueden vivir sin operación
-- ========================================

-- ========================================
-- TABLA: operations
-- ========================================
-- Operaciones son carpetas lógicas que agrupan documentos relacionados.
-- Representan un caso, trámite o contexto (ej: "Venta de propiedad", "Firma de NDA").

CREATE TABLE IF NOT EXISTS operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  name TEXT NOT NULL,
  description TEXT,

  -- Estados canónicos según contrato P0
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed', 'archived')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT operations_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Índices para performance
CREATE INDEX idx_operations_owner_status
  ON operations (owner_id, status, created_at DESC);

CREATE INDEX idx_operations_status
  ON operations (status)
  WHERE status = 'active';

-- Comentarios
COMMENT ON TABLE operations IS 'Carpetas lógicas para agrupar documentos relacionados';
COMMENT ON COLUMN operations.name IS 'Nombre de la operación (ej: "Venta de propiedad X")';
COMMENT ON COLUMN operations.status IS 'Estado: active (en curso), closed (finalizada), archived (fallida/cancelada)';

-- ========================================
-- TABLA: operation_documents
-- ========================================
-- Relación many-to-many entre operaciones y documentos.
-- Un documento puede pertenecer a múltiples operaciones.
-- Mover documentos NO altera su evidencia.

CREATE TABLE IF NOT EXISTS operation_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  document_entity_id UUID NOT NULL REFERENCES document_entities(id) ON DELETE CASCADE,

  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Un documento no puede estar duplicado en la misma operación
  CONSTRAINT operation_documents_unique
    UNIQUE (operation_id, document_entity_id)
);

-- Índices para performance
CREATE INDEX idx_operation_documents_operation
  ON operation_documents (operation_id, added_at DESC);

CREATE INDEX idx_operation_documents_document
  ON operation_documents (document_entity_id);

-- Comentarios
COMMENT ON TABLE operation_documents IS 'Relación many-to-many: documentos en operaciones';
COMMENT ON COLUMN operation_documents.added_by IS 'Usuario que agregó el documento a la operación';

-- ========================================
-- TRIGGERS
-- ========================================

-- Auto-actualizar updated_at en operations
CREATE OR REPLACE FUNCTION update_operations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_operations_updated_at
  BEFORE UPDATE ON operations
  FOR EACH ROW
  EXECUTE FUNCTION update_operations_updated_at();

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Habilitar RLS
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_documents ENABLE ROW LEVEL SECURITY;

-- operations: owners pueden ver, insertar y actualizar sus operaciones
CREATE POLICY "Owners can view their operations"
  ON operations FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert operations"
  ON operations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their operations"
  ON operations FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

-- IMPORTANTE: NO hay política de DELETE porque nada se borra.
-- Solo se cambia el estado a 'archived'.

-- operation_documents: owners pueden gestionar documentos en sus operaciones
CREATE POLICY "Owners can view operation_documents"
  ON operation_documents FOR SELECT
  TO authenticated
  USING (
    auth.uid() = (SELECT owner_id FROM operations WHERE id = operation_id)
  );

CREATE POLICY "Owners can insert operation_documents"
  ON operation_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM operations WHERE id = operation_id)
    AND auth.uid() = (SELECT owner_id FROM document_entities WHERE id = document_entity_id)
  );

CREATE POLICY "Owners can delete operation_documents"
  ON operation_documents FOR DELETE
  TO authenticated
  USING (
    auth.uid() = (SELECT owner_id FROM operations WHERE id = operation_id)
  );

-- ========================================
-- GRANTS (Permisos)
-- ========================================

GRANT SELECT, INSERT, UPDATE ON operations TO authenticated;
GRANT SELECT, INSERT, DELETE ON operation_documents TO authenticated;

-- Service role tiene acceso completo
GRANT ALL ON operations TO service_role;
GRANT ALL ON operation_documents TO service_role;

-- ========================================
-- FUNCIONES AUXILIARES
-- ========================================

-- Función para contar documentos en una operación
CREATE OR REPLACE FUNCTION count_documents_in_operation(operation_id_param UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM operation_documents
  WHERE operation_id = operation_id_param;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION count_documents_in_operation IS 'Cuenta documentos en una operación';

-- ========================================
-- VALIDACIÓN
-- ========================================

-- Verificar que las tablas se crearon correctamente
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'operations') THEN
    RAISE EXCEPTION 'operations table was not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'operation_documents') THEN
    RAISE EXCEPTION 'operation_documents table was not created';
  END IF;

  RAISE NOTICE 'Operaciones schema created successfully';
END;
$$;

-- ========================================
-- FIN DE MIGRACIÓN
-- ========================================
