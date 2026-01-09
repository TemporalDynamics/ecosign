-- ========================================
-- CUSTODY STORAGE BUCKET - EcoSign Sprint 4
-- Fecha: 2026-01-10
-- Contrato: DOCUMENT_ENTITY_CONTRACT.md (custody_mode)
-- ========================================
-- Este bucket almacena archivos originales CIFRADOS cuando:
-- - custody_mode = 'encrypted_custody'
-- - Usuario eligió "Guardar original cifrado"
--
-- Seguridad:
-- - Archivos SIEMPRE cifrados client-side antes de subir
-- - RLS estricto: solo owner puede acceder
-- - NO hay endpoint público
-- - NO se usa para witness PDFs (esos van a bucket 'documents')
-- ========================================

-- ========================================
-- 1. CREAR BUCKET 'custody'
-- ========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'custody',
  'custody',
  false,  -- NEVER public (archivos cifrados)
  104857600,  -- 100MB max file size
  NULL  -- Permitir cualquier MIME (están cifrados, no importa el tipo original)
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE storage.buckets IS 'custody bucket: encrypted originals (custody_mode=encrypted_custody)';

-- ========================================
-- 2. RLS POLICIES (STRICT)
-- ========================================

-- Policy 1: Solo owner puede subir archivos cifrados
-- Path format: {user_id}/{document_entity_id}/encrypted_source
CREATE POLICY "custody_owner_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'custody'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Solo owner puede leer archivos cifrados
CREATE POLICY "custody_owner_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'custody'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Solo owner puede eliminar archivos cifrados
CREATE POLICY "custody_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'custody'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- NOTA: NO hay policy UPDATE (archivos inmutables)

-- ========================================
-- 3. VALIDACIÓN
-- ========================================

DO $$
BEGIN
  -- Verificar que el bucket existe
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'custody'
  ) THEN
    RAISE EXCEPTION 'Custody bucket not created';
  END IF;

  -- Verificar que NO es público
  IF EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'custody' AND public = true
  ) THEN
    RAISE EXCEPTION 'Custody bucket MUST NOT be public';
  END IF;

  RAISE NOTICE 'Custody storage bucket created successfully';
END;
$$;

-- ========================================
-- 4. EJEMPLO DE USO (COMENTARIO)
-- ========================================

-- Subir archivo cifrado:
-- Path: {user_id}/{document_entity_id}/encrypted_source
-- Ejemplo: 550e8400-e29b-41d4-a716-446655440000/d03545b7-e1e3-4124-9cd4-ddc7206c14f5/encrypted_source
--
-- El archivo ya viene cifrado desde el cliente (AES-256-GCM).
-- La clave de cifrado se deriva del master key del usuario (NUNCA se almacena en server).
--
-- Metadata almacenada en document_entities:
-- - source_storage_path: 'custody/{path}'
-- - custody_mode: 'encrypted_custody'
-- - source_hash: hash del archivo ORIGINAL (antes de cifrar)

-- ========================================
-- FIN DE MIGRACIÓN
-- ========================================
