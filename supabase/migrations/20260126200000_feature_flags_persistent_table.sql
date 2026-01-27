-- ============================================
-- Migration: Feature Flags Persistent Table
-- Fecha: 2026-01-26
-- Descripción: Crea tabla persistente para almacenar estado de feature flags
-- que se sincronizan desde Deno (TypeScript) hacia PostgreSQL
-- ============================================

-- ============================================
-- CREAR TABLA DE FEATURE FLAGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  flag_name TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA RENDIMIENTO
-- ============================================
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled 
  ON public.feature_flags (enabled);

-- ============================================
-- INSERTAR FLAGS POR DEFECTO
-- ============================================
INSERT INTO public.feature_flags (flag_name, enabled) VALUES
  ('D1_RUN_TSA_ENABLED', false),
  ('D3_BUILD_ARTIFACT_ENABLED', false),
  ('D4_ANCHORS_ENABLED', false),
  ('D5_NOTIFICATIONS_ENABLED', false)
ON CONFLICT (flag_name) DO NOTHING;

-- ============================================
-- FUNCIÓN PARA ACTUALIZAR FECHA DE MODIFICACIÓN
-- ============================================
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- TRIGGER PARA ACTUALIZAR FECHA DE MODIFICACIÓN
-- ============================================
CREATE TRIGGER update_feature_flags_updated_at 
  BEFORE UPDATE ON public.feature_flags 
  FOR EACH ROW 
  EXECUTE FUNCTION update_feature_flags_updated_at_column();

-- ============================================
-- FUNCIÓN ACTUALIZADA: Verificar si una decisión está bajo autoridad canónica
-- ============================================
CREATE OR REPLACE FUNCTION public.is_decision_under_canonical_authority(decision_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  flag_enabled BOOLEAN;
BEGIN
  -- Leer el estado del flag desde la tabla persistente
  SELECT enabled INTO flag_enabled
  FROM public.feature_flags
  WHERE flag_name = decision_id;
  
  -- Si no existe el flag o es NULL, devolver FALSE (modo legacy por defecto)
  RETURN COALESCE(flag_enabled, FALSE);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN ACTUALIZADA: Verificar si una decisión está en modo shadow
-- ============================================
CREATE OR REPLACE FUNCTION public.is_decision_in_shadow_mode(decision_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT public.is_decision_under_canonical_authority(decision_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================
COMMENT ON TABLE public.feature_flags IS 'Tabla persistente para almacenar el estado de feature flags que controlan la autoridad canónica';
COMMENT ON COLUMN public.feature_flags.flag_name IS 'Nombre del flag (ej: D1_RUN_TSA_ENABLED)';
COMMENT ON COLUMN public.feature_flags.enabled IS 'Estado del flag (true=activo, false=inactivo)';
COMMENT ON COLUMN public.feature_flags.updated_at IS 'Última actualización del flag';
COMMENT ON COLUMN public.feature_flags.created_at IS 'Fecha de creación del registro';

COMMENT ON FUNCTION public.is_decision_under_canonical_authority IS 'Verifica si una decisión específica está bajo autoridad canónica leyendo de la tabla persistente';
COMMENT ON FUNCTION public.is_decision_in_shadow_mode IS 'Verifica si una decisión específica está en modo shadow (no bajo autoridad canónica)';