-- LEGACY: replaced by 20260129120000_final_feature_flags.sql
-- NOTE: kept for history; do not edit.

-- ============================================
-- Migration: Safe Feature Flags Table Creation
-- Fecha: 2026-01-27
-- Descripción: Crea tabla de feature flags con manejo seguro de existencia
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
-- CREAR ÍNDICE SI NO EXISTE
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'feature_flags' 
    AND indexname = 'idx_feature_flags_enabled'
  ) THEN
    CREATE INDEX idx_feature_flags_enabled 
      ON public.feature_flags (enabled);
  END IF;
END $$;

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
-- CREAR FUNCIÓN DE ACTUALIZACIÓN DE FECHA SI NO EXISTE
-- ============================================
DO $do$
BEGIN
  -- Eliminar función si ya existe (por seguridad)
  DROP FUNCTION IF EXISTS update_feature_flags_updated_at_column() CASCADE;
  
  -- Crear función de actualización
  CREATE OR REPLACE FUNCTION update_feature_flags_updated_at_column()
  RETURNS TRIGGER AS $fn$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $fn$ LANGUAGE plpgsql;
END $do$;

-- ============================================
-- CREAR TRIGGER DE ACTUALIZACIÓN SI NO EXISTE
-- ============================================
DO $$
BEGIN
  -- Eliminar trigger si ya existe
  DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON public.feature_flags;
  
  -- Crear trigger de actualización
  CREATE TRIGGER update_feature_flags_updated_at 
    BEFORE UPDATE ON public.feature_flags 
    FOR EACH ROW 
    EXECUTE FUNCTION update_feature_flags_updated_at_column();
END $$;

-- ============================================
-- CREAR FUNCIÓN DE VERIFICACIÓN DE AUTORIDAD CANÓNICA
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
-- CREAR FUNCIÓN DE VERIFICACIÓN DE MODO SHADOW
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

-- ============================================
-- VERIFICACIÓN
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Tabla y funciones de feature flags creadas o actualizadas';
  RAISE NOTICE '   - Tabla: feature_flags';
  RAISE NOTICE '   - Funciones: is_decision_under_canonical_authority, is_decision_in_shadow_mode';
  RAISE NOTICE '   - Flags por defecto: D1, D3, D4, D5';
END $$;
