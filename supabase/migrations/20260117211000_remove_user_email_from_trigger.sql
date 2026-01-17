-- Remove auth.users dependency from blockchain anchoring trigger payloads
CREATE OR REPLACE FUNCTION public.trigger_blockchain_anchoring()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url text;
  service_role_key text;
  polygon_request_id bigint;
  bitcoin_request_id bigint;
  canonical_witness_hash text;
  document_entity_id_val uuid;
BEGIN
  -- Only process INSERT operations
  IF (TG_OP != 'INSERT') THEN
    RETURN NEW;
  END IF;

  -- Hardcoded Supabase URL (public, not a secret)
  supabase_url := 'https://uiyojopjbhooxrmamaiw.supabase.co';

  -- Service role key from vault for Edge Function auth
  SELECT secret
    INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  IF service_role_key IS NULL THEN
    RAISE WARNING 'Blockchain anchoring trigger: SUPABASE_SERVICE_ROLE_KEY not found in vault.decrypted_secrets';
    RETURN NEW;
  END IF;

  -- ✅ CANONICAL INTEGRATION: Resolve witness_hash from document_entities
  document_entity_id_val := NEW.document_entity_id;

  IF document_entity_id_val IS NOT NULL THEN
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
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key,
          'apikey', service_role_key
        ),
        body := jsonb_build_object(
          'documentHash', canonical_witness_hash,
          'documentId', NEW.id,
          'userDocumentId', NEW.id,
          'userId', NEW.user_id,
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
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key,
          'apikey', service_role_key
        ),
        body := jsonb_build_object(
          'documentHash', canonical_witness_hash,
          'documentId', NEW.id,
          'userDocumentId', NEW.id,
          'userId', NEW.user_id,
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
$function$;
