-- Migración 014: Permitir que anchors referencie user_documents
-- Agregar columnas faltantes para compatibilidad con DocumentsPage

-- Agregar eco_hash a user_documents para compatibilidad con DocumentsPage
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS eco_hash TEXT;

-- Índice para eco_hash
CREATE INDEX IF NOT EXISTS idx_user_documents_eco_hash ON user_documents(eco_hash) WHERE eco_hash IS NOT NULL;

-- Hacer document_id nullable para permitir usar user_document_id en su lugar
ALTER TABLE anchors ALTER COLUMN document_id DROP NOT NULL;

-- Agregar columna para referenciar user_documents
ALTER TABLE anchors ADD COLUMN IF NOT EXISTS user_document_id UUID REFERENCES user_documents(id) ON DELETE CASCADE;

-- Índice para user_document_id
CREATE INDEX IF NOT EXISTS idx_anchors_user_document ON anchors(user_document_id);

-- Restricción: debe tener document_id O user_document_id (pero no ambos ni ninguno)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_document_reference'
  ) THEN
    ALTER TABLE anchors ADD CONSTRAINT check_document_reference
      CHECK (
        (document_id IS NOT NULL AND user_document_id IS NULL) OR
        (document_id IS NULL AND user_document_id IS NOT NULL)
      );
  END IF;
END $$;

-- Actualizar política RLS para incluir user_documents
DROP POLICY IF EXISTS "Users can view their own anchors" ON anchors;
CREATE POLICY "Users can view their own anchors"
  ON anchors FOR SELECT
  USING (
    auth.uid() = user_id OR
    user_document_id IN (SELECT id FROM user_documents WHERE user_id = auth.uid())
  );
