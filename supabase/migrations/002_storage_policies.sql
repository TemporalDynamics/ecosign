-- ========================================
-- VerifySign - Storage Policies
-- Version: 1.0.0
-- Date: 2025-11-09
-- ========================================
-- Policies para Supabase Storage Buckets
-- ========================================

-- IMPORTANTE: Antes de ejecutar este SQL, crear los buckets en:
-- Supabase Dashboard > Storage > New Bucket
--
-- Buckets requeridos (todos PRIVATE):
-- 1. eco-files
-- 2. ecox-files
-- 3. nda-signatures
-- 4. proofs
-- 5. temp-uploads

-- ========================================
-- BUCKET: eco-files
-- Archivos .ECO generados
-- ========================================

-- Policy 1: Owner puede INSERT (subir sus .ECO)
CREATE POLICY "Owners can upload ECO files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'eco-files' AND
  -- Path format: {owner_id}/{document_id}/certificate.eco
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Owner puede SELECT (leer sus archivos)
CREATE POLICY "Owners can read their ECO files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'eco-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Service role puede hacer todo (Netlify Functions)
-- No necesita policy explícita, service_role tiene acceso total

-- ========================================
-- BUCKET: ecox-files
-- Archivos .ECOX con historial completo
-- ========================================

CREATE POLICY "Owners can upload ECOX files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ecox-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners can read their ECOX files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ecox-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ========================================
-- BUCKET: nda-signatures
-- Firmas de NDA (.eco con hash de aceptación)
-- ========================================

CREATE POLICY "Owners can upload NDA signatures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'nda-signatures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners can read NDA signatures"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'nda-signatures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ========================================
-- BUCKET: proofs
-- Pruebas de blockchain (.ots, .json)
-- ========================================

CREATE POLICY "Owners can upload proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners can read their proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy especial: Proofs pueden ser leídos públicamente (verificación independiente)
CREATE POLICY "Anyone can read proofs"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'proofs');

-- ========================================
-- BUCKET: temp-uploads
-- Uploads temporales (auto-delete 24h)
-- ========================================

CREATE POLICY "Authenticated users can upload temp files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'temp-uploads');

CREATE POLICY "Authenticated users can read their temp files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'temp-uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Authenticated users can delete their temp files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'temp-uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ========================================
-- LIFECYCLE POLICY (Configurar en Dashboard)
-- ========================================

-- IMPORTANTE: Configurar en Supabase Dashboard > Storage > temp-uploads > Lifecycle
-- Rule: Delete files older than 24 hours
--
-- JSON Config:
-- {
--   "rules": [
--     {
--       "action": "delete",
--       "condition": {
--         "age": 86400
--       }
--     }
--   ]
-- }

-- ========================================
-- VERIFICACIÓN DE POLÍTICAS
-- ========================================

-- Verificar que las policies se crearon correctamente
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'objects'
ORDER BY policyname;

-- ========================================
-- FIN DE MIGRACIÓN
-- ========================================
