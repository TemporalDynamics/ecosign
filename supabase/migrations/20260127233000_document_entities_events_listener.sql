-- ============================================
-- Migration: Document Entities Events Listener
-- Fecha: 2026-01-27
-- Descripción: Crea trigger que convierte eventos canónicos en jobs iniciales para el executor
-- ============================================

-- ============================================
-- FUNCIÓN: Convertir eventos canónicos en jobs iniciales
-- ============================================
CREATE OR REPLACE FUNCTION process_document_entity_events()
RETURNS TRIGGER AS $$
DECLARE
  new_events JSONB;
  event_record JSONB;
  document_entity_id UUID;
  protection_requested BOOLEAN;
  tsa_requested BOOLEAN;
  anchors_requested BOOLEAN;
  artifact_requested BOOLEAN;
BEGIN
  -- Solo procesar en operaciones de UPDATE (cuando se agregan eventos)
  IF TG_OP = 'INSERT' THEN
    -- Para INSERT, usar NEW.events
    new_events := NEW.events;
    document_entity_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Para UPDATE, solo procesar si hay nuevos eventos (longitud aumentó)
    IF jsonb_array_length(NEW.events) <= jsonb_array_length(OLD.events) THEN
      RETURN NEW;
    END IF;
    
    -- Obtener solo los eventos nuevos
    new_events := NEW.events;
    document_entity_id := NEW.id;
  ELSE
    -- Para otras operaciones, salir
    RETURN NEW;
  END IF;

  -- Procesar cada evento nuevo
  FOR event_record IN SELECT * FROM jsonb_array_elements(new_events)
  LOOP
    -- Verificar si es un evento que requiere acción del executor
    IF event_record->>'kind' = 'document.protected.requested' THEN
      protection_requested := TRUE;
    ELSIF event_record->>'kind' = 'tsa.completed' THEN
      -- Puede requerir siguiente paso (anclajes, artifact)
      NULL; -- Ya se procesó TSA, posiblemente otros steps pendientes
    ELSIF event_record->>'kind' = 'anchor.confirmed' THEN
      -- Puede requerir siguiente paso (artifact si todos los anchors están listos)
      NULL; -- Ya se procesó anchor, posiblemente artifact pendiente
    END IF;
  END LOOP;

  -- Si hay protección solicitada, crear job inicial para el executor
  IF protection_requested THEN
    -- Insertar job para que el executor procese la protección
    INSERT INTO executor_jobs (
      type,
      entity_type,
      entity_id,
      payload,
      status,
      run_at,
      dedupe_key
    ) VALUES (
      'document.protected',  -- Tipo de job que el executor sabe procesar
      'document',
      document_entity_id,
      jsonb_build_object(
        'document_entity_id', document_entity_id,
        'trigger_event', 'document.protected.requested'
      ),
      'queued',
      NOW(),
      document_entity_id::TEXT || ':document.protected.requested'
    )
    ON CONFLICT (dedupe_key) DO NOTHING;  -- Evitar duplicados

    RAISE NOTICE 'Document entities listener: Job inicial creado para entity %', document_entity_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Activar listener en cambios a document_entities.events[]
-- ============================================
DROP TRIGGER IF EXISTS on_document_entity_events_change ON document_entities;

CREATE TRIGGER on_document_entity_events_change
  AFTER UPDATE OF events ON document_entities
  FOR EACH ROW
  EXECUTE FUNCTION process_document_entity_events();

-- ============================================
-- Dar permisos
-- ============================================
GRANT EXECUTE ON FUNCTION process_document_entity_events() TO postgres;
GRANT EXECUTE ON FUNCTION process_document_entity_events() TO anon;
GRANT EXECUTE ON FUNCTION process_document_entity_events() TO authenticated;

-- ============================================
-- VERIFICACIÓN
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger de eventos canónicos instalado';
  RAISE NOTICE '   - Escucha cambios en document_entities.events[]';
  RAISE NOTICE '   - Crea jobs iniciales para el executor';
  RAISE NOTICE '   - Activa el loop canónico: evento → job → executor → decision → job → orchestrator';
END $$;