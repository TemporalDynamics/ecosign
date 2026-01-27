-- ============================================
-- Migration: Update blockchain anchoring trigger with feature flags
-- Fecha: 2026-01-26
-- Descripción: Actualiza el trigger para usar feature flags que controlan autoridad canónica
-- ============================================

-- ============================================
-- FUNCIÓN ACTUALIZADA: Trigger blockchain anchoring con checks de flags
-- ============================================
CREATE OR REPLACE FUNCTION trigger_blockchain_anchoring()
RETURNS TRIGGER
SECURITY DEFINER -- Run with function owner's privileges (service role access)
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  supabase_url text;
  service_key text;
  polygon_request_id bigint;
  bitcoin_request_id bigint;
BEGIN
  -- Only process INSERT operations
  IF (TG_OP != 'INSERT') THEN
    RETURN NEW;
  END IF;

  -- Check if D4 (anchors) decision is under canonical authority
  -- If so, this trigger should not execute (executor handles it)
  IF public.is_decision_under_canonical_authority('D4_ANCHORS_ENABLED') THEN
    RAISE NOTICE 'Blockchain anchoring trigger: D4 under canonical authority, skipping direct calls for document %', NEW.id;
    RETURN NEW;
  END IF;

  -- Get Supabase URL and service role key from app settings
  BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Blockchain anchoring trigger: Missing app settings (supabase_url or service_role_key)';
      RETURN NEW;
  END;

  -- Validate settings exist
  IF supabase_url IS NULL OR service_key IS NULL THEN
    RAISE WARNING 'Blockchain anchoring trigger: Settings are NULL';
    RETURN NEW;
  END IF;

  -- Trigger Polygon anchoring if status is pending
  IF NEW.polygon_status = 'pending' THEN
    BEGIN
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/anchor-polygon',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || service_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'documentHash', NEW.document_hash,
          'documentId', NEW.id,
          'userDocumentId', NEW.id,
          'userId', NEW.user_id,
          'userEmail', (SELECT email FROM auth.users WHERE id = NEW.user_id),
          'metadata', jsonb_build_object(
            'source', 'database_trigger',
            'documentName', NEW.document_name
          )
        )
      ) INTO polygon_request_id;

      RAISE NOTICE 'Polygon anchor triggered for document %: request_id=%', NEW.id, polygon_request_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to trigger Polygon anchor for document %: %', NEW.id, SQLERRM;
    END;
  END IF;

  -- Trigger Bitcoin anchoring if status is pending
  IF NEW.bitcoin_status = 'pending' THEN
    BEGIN
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/anchor-bitcoin',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || service_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'documentHash', NEW.document_hash,
          'documentId', NEW.id,
          'userDocumentId', NEW.id,
          'userId', NEW.user_id,
          'userEmail', (SELECT email FROM auth.users WHERE id = NEW.user_id),
          'metadata', jsonb_build_object(
            'source', 'database_trigger',
            'documentName', NEW.document_name
          )
        )
      ) INTO bitcoin_request_id;

      RAISE NOTICE 'Bitcoin anchor triggered for document %: request_id=%', NEW.id, bitcoin_request_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to trigger Bitcoin anchor for document %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- RE-CREAR TRIGGER (ya existe, pero con nueva lógica)
-- ============================================
-- El trigger ya existe desde la migración original, solo se actualiza la función
-- El trigger on_user_documents_blockchain_anchoring se mantiene igual

-- ============================================
-- VERIFICACIÓN
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Trigger blockchain anchoring actualizado con checks de feature flags';
  RAISE NOTICE 'Ahora verifica: is_decision_under_canonical_authority(''D4_ANCHORS_ENABLED'')';
END $$;