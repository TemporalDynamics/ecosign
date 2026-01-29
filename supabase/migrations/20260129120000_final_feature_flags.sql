-- ============================================
-- Migration: Final Feature Flags (Consolidated)
-- Fecha: 2026-01-29
-- Descripción: Estado final consolidado de feature_flags y funciones de autoridad
-- ============================================

-- ============================================
-- CREAR TABLA DE FEATURE FLAGS SI NO EXISTE
-- ============================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  flag_name TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICE PARA RENDIMIENTO
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
ON CONFLICT (flag_name) DO UPDATE SET
  enabled = EXCLUDED.enabled;

-- ============================================
-- FUNCIÓN PARA ACTUALIZAR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at_column()
RETURNS TRIGGER AS $fn$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER PARA updated_at (solo si no existe)
-- ============================================
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_feature_flags_updated_at'
  ) THEN
    CREATE TRIGGER update_feature_flags_updated_at
      BEFORE UPDATE ON public.feature_flags
      FOR EACH ROW
      EXECUTE FUNCTION update_feature_flags_updated_at_column();
  END IF;
END $do$;

-- ============================================
-- FUNCIÓN: Verificar autoridad canónica
-- ============================================
CREATE OR REPLACE FUNCTION public.is_decision_under_canonical_authority(decision_id TEXT)
RETURNS BOOLEAN AS $fn$
DECLARE
  flag_enabled BOOLEAN;
BEGIN
  SELECT enabled INTO flag_enabled
  FROM public.feature_flags
  WHERE flag_name = decision_id;

  RETURN COALESCE(flag_enabled, FALSE);
END;
$fn$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN: Modo shadow
-- ============================================
CREATE OR REPLACE FUNCTION public.is_decision_in_shadow_mode(decision_id TEXT)
RETURNS BOOLEAN AS $fn$
BEGIN
  RETURN NOT public.is_decision_under_canonical_authority(decision_id);
END;
$fn$ LANGUAGE plpgsql;

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

-- ============================================
-- VERIFICACIÓN
-- ============================================
DO $do$
BEGIN
  RAISE NOTICE '✅ Feature flags (final) aplicadas';
  RAISE NOTICE '   - Tabla: feature_flags';
  RAISE NOTICE '   - Funciones: is_decision_under_canonical_authority, is_decision_in_shadow_mode';
  RAISE NOTICE '   - Flags por defecto: D1, D3, D4, D5';
END $do$;
