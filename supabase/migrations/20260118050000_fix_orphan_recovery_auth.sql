-- Migration: Fix Orphan Recovery Cron to use vault for auth
-- Created: 2026-01-18
-- Purpose: Update detect_and_recover_orphan_anchors() to use service role key from vault
--          (same pattern as trigger_blockchain_anchoring)
--
-- Problem: The orphan recovery cron was calling edge functions without Authorization header,
--          causing 401 "Missing authorization header" errors from Supabase Gateway.

CREATE OR REPLACE FUNCTION detect_and_recover_orphan_anchors()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  doc record;
  supabase_url text;
  service_role_key text;
  request_id bigint;
  orphan_count_polygon int := 0;
  orphan_count_bitcoin int := 0;
BEGIN
  -- Hardcoded Supabase URL (public, not a secret)
  supabase_url := 'https://uiyojopjbhooxrmamaiw.supabase.co';

  -- Service role key from vault for Edge Function auth
  SELECT secret
    INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  IF service_role_key IS NULL THEN
    RAISE WARNING 'Orphan recovery: SUPABASE_SERVICE_ROLE_KEY not found in vault.decrypted_secrets';
    RETURN;
  END IF;

  -- Detect Polygon orphans
  FOR doc IN
    SELECT
      ud.id,
      COALESCE(de.witness_hash, ud.document_hash) as document_hash,
      ud.user_id,
      ud.document_name,
      ud.document_entity_id
    FROM user_documents ud
    LEFT JOIN document_entities de ON de.id = ud.document_entity_id
    LEFT JOIN anchors a ON a.user_document_id = ud.id AND a.anchor_type = 'polygon'
    WHERE ud.polygon_status = 'pending'
      AND a.id IS NULL  -- No anchor exists
      AND ud.created_at > NOW() - INTERVAL '2 hours'  -- Only recent docs
    ORDER BY ud.created_at ASC
    LIMIT 10  -- Process max 10 per run to avoid overload
  LOOP
    BEGIN
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/anchor-polygon',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key,
          'apikey', service_role_key
        ),
        body := jsonb_build_object(
          'documentHash', doc.document_hash,
          'documentId', doc.id,
          'userDocumentId', doc.id,
          'userId', doc.user_id,
          'metadata', jsonb_build_object(
            'source', 'recovery_cron',
            'documentName', doc.document_name,
            'documentEntityId', doc.document_entity_id,
            'usingWitnessHash', (doc.document_entity_id IS NOT NULL)
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
      COALESCE(de.witness_hash, ud.document_hash) as document_hash,
      ud.user_id,
      ud.document_name,
      ud.document_entity_id
    FROM user_documents ud
    LEFT JOIN document_entities de ON de.id = ud.document_entity_id
    LEFT JOIN anchors a ON a.user_document_id = ud.id AND a.anchor_type = 'opentimestamps'
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
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key,
          'apikey', service_role_key
        ),
        body := jsonb_build_object(
          'documentHash', doc.document_hash,
          'documentId', doc.id,
          'userDocumentId', doc.id,
          'userId', doc.user_id,
          'metadata', jsonb_build_object(
            'source', 'recovery_cron',
            'documentName', doc.document_name,
            'documentEntityId', doc.document_entity_id,
            'usingWitnessHash', (doc.document_entity_id IS NOT NULL)
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

-- Update comment
COMMENT ON FUNCTION detect_and_recover_orphan_anchors() IS
  'Detects documents with pending anchor status but no anchor record, '
  'and triggers edge functions as recovery mechanism. Uses vault for auth. '
  'Runs every 5 minutes via cron.';
