-- ============================================
-- Migration: Final Canonical Controls (Consolidated)
-- Fecha: 2026-01-29
-- Descripción: Controles canónicos finales (sin wake)
-- ============================================

-- ============================================
-- FUNCIÓN: Verificar intento de escritura legacy
-- ============================================
CREATE OR REPLACE FUNCTION public.check_legacy_write_attempt(table_name TEXT)
RETURNS BOOLEAN AS $fn$
DECLARE
  canonical_mode TEXT;
  is_legacy_table BOOLEAN;
BEGIN
  SELECT current_setting('app.mode.canonical_only', true) INTO canonical_mode;

  IF canonical_mode != 'true' THEN
    RETURN TRUE;
  END IF;

  is_legacy_table := table_name IN ('user_documents', 'documents', 'legacy_documents');
  IF is_legacy_table THEN
    RAISE EXCEPTION 'Legacy write blocked in pure canonical mode: %', table_name;
  END IF;

  RETURN TRUE;
END;
$fn$ LANGUAGE plpgsql;

-- ============================================
-- PERMISOS
-- ============================================
GRANT EXECUTE ON FUNCTION public.check_legacy_write_attempt(TEXT) TO postgres;
GRANT EXECUTE ON FUNCTION public.check_legacy_write_attempt(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_legacy_write_attempt(TEXT) TO authenticated;

-- ============================================
-- COMENTARIO
-- ============================================
COMMENT ON FUNCTION public.check_legacy_write_attempt IS
  'Verifica si se intenta escribir en tabla legacy en modo canónico puro';

-- ============================================
-- VERIFICACIÓN
-- ============================================
DO $do$
BEGIN
  RAISE NOTICE '✅ Controles canónicos (final) aplicados';
  RAISE NOTICE '   - check_legacy_write_attempt(): Control de escrituras legacy';
END $do$;
