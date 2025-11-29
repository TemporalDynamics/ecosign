-- ============================================================================
-- Migración: Fix Storage RLS Recursion
-- Fecha: 2025-11-29
-- Problema: Storage policies hacen JOIN con signature_workflows causando recursión
-- Solución: Simplificar usando solo comprobación de folder ownership
-- ============================================================================

-- Drop la policy problemática
DROP POLICY IF EXISTS "Workflow participants can read documents" ON storage.objects;

-- Crear policy MUY simplificada que solo verifica ownership del folder
-- Esto evita completamente la recursión con signature_workflows
CREATE POLICY "Users can read their documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy simplificada para INSERT también
DROP POLICY IF EXISTS "Authenticated users can upload to own folder" ON storage.objects;

CREATE POLICY "Users can upload to their folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- NOTA IMPORTANTE:
-- Esta es una policy MUY simple que solo permite acceso a archivos en la
-- carpeta del usuario (user_id/*).
--
-- Para compartir documentos entre usuarios (ej: workflows con múltiples signers),
-- necesitarás una de estas opciones:
--
-- 1. Generar signed URLs desde el backend (función edge) con service role
-- 2. Copiar el documento a la carpeta de cada signer cuando se asigna
-- 3. Usar una tabla de permisos (document_permissions) sin hacer JOIN a workflows
--
-- Por ahora, esta policy simple evita la recursión y permite el flujo básico.
-- ============================================================================
