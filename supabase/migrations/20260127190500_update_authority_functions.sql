-- LEGACY: replaced by 20260129120000_final_feature_flags.sql
-- NOTE: kept for history; do not edit.

-- ============================================
-- Migration: Update Authority Verification Function
-- Fecha: 2026-01-27
-- Descripción: Actualiza la función para usar la tabla feature_flags existente
-- ============================================

-- ============================================
-- ACTUALIZAR FUNCIÓN DE VERIFICACIÓN DE AUTORIDAD
-- ============================================
-- Asegurar que la función use la tabla existente feature_flags
CREATE OR REPLACE FUNCTION public.is_decision_under_canonical_authority(decision_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  flag_enabled BOOLEAN;
BEGIN
  -- Leer el estado del flag desde la tabla existente
  SELECT enabled INTO flag_enabled
  FROM public.feature_flags  -- Usar tabla feature_flags (no feature_flags)
  WHERE flag_name = decision_id;
  
  -- Si no existe el flag o es NULL, devolver FALSE (modo legacy por defecto)
  RETURN COALESCE(flag_enabled, FALSE);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ACTUALIZAR FUNCIÓN DE MODO SHADOW
-- ============================================
CREATE OR REPLACE FUNCTION public.is_decision_in_shadow_mode(decision_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT public.is_decision_under_canonical_authority(decision_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICACIÓN
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Funciones de verificación de autoridad actualizadas';
  RAISE NOTICE '   - is_decision_under_canonical_authority()';
  RAISE NOTICE '   - is_decision_in_shadow_mode()';
  RAISE NOTICE '   - Ambas leen de tabla feature_flags';
END $$;