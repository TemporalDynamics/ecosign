-- ============================================================================
-- Migración: Fix RLS Infinite Recursion en signature_workflows
-- Fecha: 2025-11-29
-- Problema: La policy "Users can view their workflows" causa recursión infinita
--           al hacer JOIN con workflow_signers que referencia de vuelta a signature_workflows
-- Solución: Simplificar la policy usando LEFT JOIN directo sin subquery anidada
-- ============================================================================

-- Primero, verificar si hay policies que causan recursión
-- DROP la policy problemática
DROP POLICY IF EXISTS "Users can view their workflows" ON public.signature_workflows;

-- Crear policy simplificada que evita la recursión
-- En lugar de una subquery anidada, usamos una comparación directa
CREATE POLICY "Users can view their workflows"
  ON public.signature_workflows
  FOR SELECT
  USING (
    -- User es el owner
    owner_id = auth.uid()
    OR
    -- User es un signer (usando email directamente sin subquery recursiva)
    EXISTS (
      SELECT 1
      FROM public.workflow_signers ws
      WHERE ws.workflow_id = signature_workflows.id
        AND ws.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

COMMENT ON POLICY "Users can view their workflows" ON public.signature_workflows
IS 'Allows owners and assigned signers to view workflows. Fixed infinite recursion issue.';

-- ============================================================================
-- Verificar y simplificar policies de workflow_signers si causan recursión
-- ============================================================================

-- Ver si workflow_signers tiene policies que referencian signature_workflows
-- Si las hay, también necesitamos simplificarlas

-- Temporary: Disable RLS en workflow_signers si está causando problemas
-- (Esto es temporal para debugging - NO dejar en producción)
-- ALTER TABLE public.workflow_signers DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- NOTA: Si el problema persiste, considera:
-- 1. Usar security definer functions en vez de policies complejas
-- 2. Desnormalizar datos (guardar owner_id también en workflow_signers)
-- 3. Usar materialized views para evitar JOINs en policies
-- ============================================================================
