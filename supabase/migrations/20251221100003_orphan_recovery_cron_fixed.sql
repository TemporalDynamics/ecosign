-- Migration: Cron Job de Recuperación para Anchors Huérfanos (FIXED)
-- Created: 2025-12-21
-- Fixed: Removed app.settings dependency (not available in Supabase Cloud)
--
-- Purpose: Safety net que detecta documentos con anchoring pending pero sin
--          registro en tabla anchors, y dispara las edge functions como fallback.
--
-- Frecuencia: Cada 5 minutos
-- Ventana: Solo documentos creados en las últimas 2 horas
--
-- Casos que cubre:
-- 1. Trigger falló por algún motivo
-- 2. Edge function devolvió error temporal
-- 3. Red/timeout durante invocación inicial

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create recovery function (without app.settings dependency)
CREATE OR REPLACE FUNCTION detect_and_recover_orphan_anchors()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  doc record;
  supabase_url text;
  request_id bigint;
  orphan_count_polygon int := 0;
  orphan_count_bitcoin int := 0;
BEGIN
  -- Hardcoded Supabase URL (public, not a secret)
  supabase_url := 'https://uiyojopjbhooxrmamaiw.supabase.co';

  -- Detect Polygon orphans
  FOR doc IN
    SELECT
      ud.id,
      ud.document_hash,
      ud.user_id,
      ud.document_name,
      u.email as user_email
    FROM user_documents ud
    LEFT JOIN anchors a ON a.user_document_id = ud.id AND a.anchor_type = 'polygon'
    LEFT JOIN auth.users u ON u.id = ud.user_id
    WHERE ud.polygon_status = 'pending'
      AND a.id IS NULL  -- No anchor exists
      AND ud.created_at > NOW() - INTERVAL '2 hours'  -- Only recent docs
    ORDER BY ud.created_at ASC
    LIMIT 10  -- Process max 10 per run to avoid overload
  LOOP
    BEGIN
      -- Edge function will use its own service_role_key from environment
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/anchor-polygon',
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'documentHash', doc.document_hash,
          'documentId', doc.id,
          'userDocumentId', doc.id,
          'userId', doc.user_id,
          'userEmail', doc.user_email,
          'metadata', jsonb_build_object(
            'source', 'recovery_cron',
            'documentName', doc.document_name
          )
        )
      ) INTO request_id;

      orphan_count_polygon := orphan_count_polygon + 1;
      RAISE NOTICE 'Recovery: Polygon anchor created for orphan document %: request_id=%', doc.id, request_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Recovery: Failed to create Polygon anchor for document %: %', doc.id, SQLERRM;
    END;
  END LOOP;

  -- Detect Bitcoin orphans
  FOR doc IN
    SELECT
      ud.id,
      ud.document_hash,
      ud.user_id,
      ud.document_name,
      u.email as user_email
    FROM user_documents ud
    LEFT JOIN anchors a ON a.user_document_id = ud.id AND a.anchor_type = 'opentimestamps'
    LEFT JOIN auth.users u ON u.id = ud.user_id
    WHERE ud.bitcoin_status = 'pending'
      AND a.id IS NULL  -- No anchor exists
      AND ud.created_at > NOW() - INTERVAL '2 hours'  -- Only recent docs
    ORDER BY ud.created_at ASC
    LIMIT 10  -- Process max 10 per run
  LOOP
    BEGIN
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/anchor-bitcoin',
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'documentHash', doc.document_hash,
          'documentId', doc.id,
          'userDocumentId', doc.id,
          'userId', doc.user_id,
          'userEmail', doc.user_email,
          'metadata', jsonb_build_object(
            'source', 'recovery_cron',
            'documentName', doc.document_name
          )
        )
      ) INTO request_id;

      orphan_count_bitcoin := orphan_count_bitcoin + 1;
      RAISE NOTICE 'Recovery: Bitcoin anchor created for orphan document %: request_id=%', doc.id, request_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Recovery: Failed to create Bitcoin anchor for document %: %', doc.id, SQLERRM;
    END;
  END LOOP;

  -- Log summary if orphans were found
  IF orphan_count_polygon > 0 OR orphan_count_bitcoin > 0 THEN
    RAISE NOTICE 'Recovery complete: % Polygon orphans, % Bitcoin orphans',
      orphan_count_polygon, orphan_count_bitcoin;
  END IF;
END;
$$;

-- Create cron job (every 5 minutes)
SELECT cron.schedule(
  'recover-orphan-anchors',
  '*/5 * * * *',  -- Every 5 minutes
  $$SELECT detect_and_recover_orphan_anchors();$$
);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION detect_and_recover_orphan_anchors() TO service_role;

-- Comments
COMMENT ON FUNCTION detect_and_recover_orphan_anchors() IS
  'Detects documents with pending anchor status but no anchor record, '
  'and triggers edge functions as recovery mechanism. Runs every 5 minutes.';
