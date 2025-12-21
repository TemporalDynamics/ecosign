-- Migration: Blockchain Anchoring Server-Side Trigger
-- Created: 2025-12-21
-- Purpose: Automatically invoke anchor-polygon and anchor-bitcoin edge functions
--          when a document is created with pending anchoring status.
--
-- This eliminates the need for client-side invocation and ensures:
-- 1. Anchoring happens even if user closes browser
-- 2. No HTTP 500 errors visible to user
-- 3. Automatic retries via edge function logic
-- 4. Clean separation: client certifies, server anchors

-- Prerequisites:
-- 1. Extension pg_net must be enabled (available by default in Supabase)
-- 2. App settings must be configured:
--    - app.settings.supabase_url
--    - app.settings.service_role_key

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function: Trigger blockchain anchoring when document is inserted with pending status
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

-- Create trigger on user_documents table
DROP TRIGGER IF EXISTS on_user_documents_blockchain_anchoring ON user_documents;

CREATE TRIGGER on_user_documents_blockchain_anchoring
  AFTER INSERT ON user_documents
  FOR EACH ROW
  WHEN (NEW.polygon_status = 'pending' OR NEW.bitcoin_status = 'pending')
  EXECUTE FUNCTION trigger_blockchain_anchoring();

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION trigger_blockchain_anchoring() TO service_role;

-- Comment for documentation
COMMENT ON FUNCTION trigger_blockchain_anchoring() IS 
  'Automatically triggers blockchain anchoring edge functions when a document is created with pending status. '
  'This ensures anchoring happens server-side without client involvement.';

COMMENT ON TRIGGER on_user_documents_blockchain_anchoring ON user_documents IS
  'Triggers blockchain anchoring (Polygon/Bitcoin) automatically after document insertion. '
  'Client only needs to insert document with pending status; server handles the rest.';
