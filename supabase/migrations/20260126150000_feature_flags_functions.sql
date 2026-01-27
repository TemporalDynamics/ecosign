-- ============================================
-- Feature Flags para Autoridad Canónica
-- ============================================
-- Este archivo define funciones auxiliares para que los triggers PL/pgSQL
-- verifiquen si deben ejecutar lógica legacy o ceder autoridad al executor.

-- ============================================
-- FUNCIÓN: Verificar si una decisión está bajo autoridad canónica
-- ============================================
CREATE OR REPLACE FUNCTION public.is_decision_under_canonical_authority(decision_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  flag_value TEXT;
BEGIN
  -- Consultar el flag desde los settings de la app
  SELECT current_setting('app.flags.' || decision_id, true) INTO flag_value;
  
  -- Si no existe o es NULL, devolver FALSE (modo legacy por defecto)
  IF flag_value IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Convertir a booleano (acepta 'true', 'TRUE', 't', '1', etc.)
  RETURN flag_value ILIKE 'true' OR flag_value = '1' OR flag_value ILIKE 't';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN: Verificar si una decisión está en modo shadow
-- ============================================
CREATE OR REPLACE FUNCTION public.is_decision_in_shadow_mode(decision_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT public.is_decision_under_canonical_authority(decision_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EJEMPLOS DE USO EN TRIGGERS:
-- ============================================
/*
-- En un trigger que maneja notificaciones:
IF public.is_decision_under_canonical_authority('D5_NOTIFICATIONS_ENABLED') THEN
  -- No hacer nada, dejar que el executor maneje las notificaciones
  RETURN NEW;
END IF;

-- En un trigger que maneja anclajes:
IF public.is_decision_under_canonical_authority('D4_ANCHORS_ENABLED') THEN
  -- No hacer nada, dejar que el executor maneje los anclajes
  RETURN NEW;
END IF;
*/

-- ============================================
-- FLAGS DISPONIBLES:
-- ============================================
-- D1_RUN_TSA_ENABLED - Controla la ejecución de TSA
-- D3_BUILD_ARTIFACT_ENABLED - Controla la construcción de artifacts
-- D4_ANCHORS_ENABLED - Controla los anclajes blockchain
-- D5_NOTIFICATIONS_ENABLED - Controla las notificaciones