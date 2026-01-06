-- Migration: Update Blockchain Anchoring Trigger to use witness_hash
-- Created: 2026-01-06
-- Purpose: Update trigger_blockchain_anchoring() to use canonical witness_hash
--          from document_entities instead of document_hash from user_documents
--
-- Contract: docs/contratos/ANCHOR_EVENT_RULES.md
-- Requirement: Anchors MUST use witness_hash (canonical truth)
--
-- Changes:
-- 1. Read document_entity_id from NEW (user_documents)
-- 2. Query document_entities for witness_hash
-- 3. Use witness_hash in anchor requests (NOT document_hash)
-- 4. Fallback to document_hash if document_entity_id is NULL (backward compat)

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
  canonical_witness_hash text;
  document_entity_id_val uuid;
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

  -- ✅ CANONICAL INTEGRATION: Resolve witness_hash from document_entities
  -- Read document_entity_id from user_documents
  document_entity_id_val := NEW.document_entity_id;

  IF document_entity_id_val IS NOT NULL THEN
    -- Query document_entities for canonical witness_hash
    SELECT witness_hash INTO canonical_witness_hash
    FROM document_entities
    WHERE id = document_entity_id_val;

    IF canonical_witness_hash IS NULL THEN
      RAISE WARNING 'Blockchain anchoring trigger: witness_hash not found for document_entity_id %, falling back to document_hash', document_entity_id_val;
      canonical_witness_hash := NEW.document_hash;
    END IF;
  ELSE
    -- Fallback: use document_hash if document_entity_id is NULL (backward compatibility)
    RAISE WARNING 'Blockchain anchoring trigger: document_entity_id is NULL for user_document %, using document_hash', NEW.id;
    canonical_witness_hash := NEW.document_hash;
  END IF;

  -- Validate that we have a hash to anchor
  IF canonical_witness_hash IS NULL THEN
    RAISE WARNING 'Blockchain anchoring trigger: No hash available for anchoring (document_id=%)', NEW.id;
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
          'documentHash', canonical_witness_hash, -- ✅ Use witness_hash
          'documentId', NEW.id,
          'userDocumentId', NEW.id,
          'userId', NEW.user_id,
          'userEmail', (SELECT email FROM auth.users WHERE id = NEW.user_id),
          'metadata', jsonb_build_object(
            'source', 'database_trigger',
            'documentName', NEW.document_name,
            'documentEntityId', document_entity_id_val,
            'usingWitnessHash', (document_entity_id_val IS NOT NULL)
          )
        )
      ) INTO polygon_request_id;

      RAISE NOTICE 'Polygon anchor triggered for document %: request_id=%, witness_hash=%', NEW.id, polygon_request_id, canonical_witness_hash;
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
          'documentHash', canonical_witness_hash, -- ✅ Use witness_hash
          'documentId', NEW.id,
          'userDocumentId', NEW.id,
          'userId', NEW.user_id,
          'userEmail', (SELECT email FROM auth.users WHERE id = NEW.user_id),
          'metadata', jsonb_build_object(
            'source', 'database_trigger',
            'documentName', NEW.document_name,
            'documentEntityId', document_entity_id_val,
            'usingWitnessHash', (document_entity_id_val IS NOT NULL)
          )
        )
      ) INTO bitcoin_request_id;

      RAISE NOTICE 'Bitcoin anchor triggered for document %: request_id=%, witness_hash=%', NEW.id, bitcoin_request_id, canonical_witness_hash;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to trigger Bitcoin anchor for document %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Comment updated for documentation
COMMENT ON FUNCTION trigger_blockchain_anchoring() IS
  'Automatically triggers blockchain anchoring edge functions when a document is created with pending status. '
  'Uses witness_hash from document_entities (canonical) instead of document_hash from user_documents. '
  'Falls back to document_hash if document_entity_id is NULL (backward compatibility).';
