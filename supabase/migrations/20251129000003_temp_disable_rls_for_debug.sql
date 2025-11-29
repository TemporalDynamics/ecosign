-- ============================================================================
-- Migración: TEMPORAL - Disable RLS for debugging recursion
-- Fecha: 2025-11-29
-- Problema: RLS policies causando recursión infinita
-- Solución TEMPORAL: Deshabilitar RLS completamente para confirmar que ese es el problema
-- ============================================================================

-- IMPORTANTE: Esta es una solución TEMPORAL solo para debugging
-- NO dejar esto en producción

-- Deshabilitar RLS en signature_workflows
ALTER TABLE public.signature_workflows DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en workflow_signers
ALTER TABLE public.workflow_signers DISABLE ROW LEVEL SECURITY;

-- Para storage.objects, en lugar de deshabilitar RLS (no tenemos permisos),
-- eliminamos todas las policies y creamos una ultra-simple que no referencia workflows
DROP POLICY IF EXISTS "Users can read their documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Workflow participants can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to own folder" ON storage.objects;

-- Policy ultra-simple: Solo permitir acceso con service role (desde backend)
-- Los usuarios normales NO podrán acceder directamente - solo vía signed URLs
CREATE POLICY "Service role full access"
ON storage.objects
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- NOTA: Esta migración es TEMPORAL
-- Después de confirmar que la recursión viene de RLS, crearemos
-- policies más simples o usaremos security definer functions
-- ============================================================================
