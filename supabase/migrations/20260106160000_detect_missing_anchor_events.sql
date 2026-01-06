-- Migration: Detect Missing Anchor Events (Dual-Write Inconsistencies)
-- Created: 2026-01-06
-- Priority: P0.3 (ÚLTIMO GAP PROBATORIO)
--
-- Purpose: Detect documents where legacy says "anchor confirmed" but events[] is empty
-- Strategy: DETECT ONLY (no mutations)
--
-- Gap: Dual-write is not atomic (legacy TX → events[] append separate)
-- Risk: If append fails, legacy OK but events[] missing
-- Impact: UI derives incorrectly (missing evidence), violates "events[] is source of truth"
--
-- Solution: Create reproducible VIEW to expose inconsistencies
-- Repair: Manual via Edge Function repair-missing-anchor-events (admin-only)

-- ============================================================================
-- 1. VIEW: Missing Polygon Anchor Events
-- ============================================================================
CREATE OR REPLACE VIEW missing_polygon_anchor_events AS
SELECT
  de.id AS document_entity_id,
  de.witness_hash,
  ud.id AS user_document_id,
  a.id AS anchor_id,
  a.polygon_tx_hash AS txid,
  a.polygon_block_number AS block_number,
  a.polygon_confirmed_at AS confirmed_at,
  a.updated_at AS anchor_updated_at,
  jsonb_array_length(de.events) AS events_count,
  -- Debug: show existing anchor events
  (
    SELECT jsonb_agg(e->'anchor'->>'network')
    FROM jsonb_array_elements(de.events) e
    WHERE e->>'kind' = 'anchor'
  ) AS existing_anchor_networks
FROM document_entities de
JOIN user_documents ud ON ud.document_entity_id = de.id
JOIN anchors a ON a.user_document_id = ud.id
WHERE a.anchor_type = 'polygon'
  AND a.anchor_status = 'confirmed'
  AND a.polygon_status = 'confirmed'
  AND a.polygon_confirmed_at IS NOT NULL
  -- Critical check: no polygon anchor event in events[]
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(de.events) e
    WHERE e->>'kind' = 'anchor'
      AND e->'anchor'->>'network' = 'polygon'
  );

COMMENT ON VIEW missing_polygon_anchor_events IS
  'Detects documents where legacy anchors table says "polygon confirmed" '
  'but document_entities.events[] has no polygon anchor event. '
  'These are dual-write inconsistencies that need manual repair. '
  'Repair: Use Edge Function repair-missing-anchor-events (admin-only).';

-- ============================================================================
-- 2. VIEW: Missing Bitcoin Anchor Events
-- ============================================================================
CREATE OR REPLACE VIEW missing_bitcoin_anchor_events AS
SELECT
  de.id AS document_entity_id,
  de.witness_hash,
  ud.id AS user_document_id,
  a.id AS anchor_id,
  (a.metadata->>'bitcoin_tx')::text AS txid,
  (a.metadata->>'block')::int AS block_number,
  a.bitcoin_confirmed_at AS confirmed_at,
  a.updated_at AS anchor_updated_at,
  jsonb_array_length(de.events) AS events_count,
  -- Debug: show existing anchor events
  (
    SELECT jsonb_agg(e->'anchor'->>'network')
    FROM jsonb_array_elements(de.events) e
    WHERE e->>'kind' = 'anchor'
  ) AS existing_anchor_networks
FROM document_entities de
JOIN user_documents ud ON ud.document_entity_id = de.id
JOIN anchors a ON a.user_document_id = ud.id
WHERE a.anchor_type = 'bitcoin'
  AND a.anchor_status = 'confirmed'
  AND a.bitcoin_confirmed_at IS NOT NULL
  -- Critical check: no bitcoin anchor event in events[]
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(de.events) e
    WHERE e->>'kind' = 'anchor'
      AND e->'anchor'->>'network' = 'bitcoin'
  );

COMMENT ON VIEW missing_bitcoin_anchor_events IS
  'Detects documents where legacy anchors table says "bitcoin confirmed" '
  'but document_entities.events[] has no bitcoin anchor event. '
  'These are dual-write inconsistencies that need manual repair. '
  'Repair: Use Edge Function repair-missing-anchor-events (admin-only).';

-- ============================================================================
-- 3. FUNCTION: Get Inconsistency Summary
-- ============================================================================
CREATE OR REPLACE FUNCTION get_anchor_inconsistency_summary()
RETURNS TABLE (
  network text,
  inconsistent_count bigint,
  sample_document_ids text[]
)
LANGUAGE sql
STABLE
AS $$
  -- Polygon inconsistencies
  SELECT
    'polygon'::text AS network,
    COUNT(*) AS inconsistent_count,
    ARRAY_AGG(document_entity_id::text ORDER BY anchor_updated_at DESC LIMIT 5) AS sample_document_ids
  FROM missing_polygon_anchor_events

  UNION ALL

  -- Bitcoin inconsistencies
  SELECT
    'bitcoin'::text AS network,
    COUNT(*) AS inconsistent_count,
    ARRAY_AGG(document_entity_id::text ORDER BY anchor_updated_at DESC LIMIT 5) AS sample_document_ids
  FROM missing_bitcoin_anchor_events;
$$;

COMMENT ON FUNCTION get_anchor_inconsistency_summary() IS
  'Returns summary of dual-write inconsistencies (missing anchor events). '
  'Shows count per network and sample document IDs for investigation. '
  'Use this to monitor system health.';

-- ============================================================================
-- 4. VALIDATION: Run Initial Detection
-- ============================================================================
DO $$
DECLARE
  polygon_count BIGINT;
  bitcoin_count BIGINT;
  total_count BIGINT;
BEGIN
  -- Count inconsistencies
  SELECT COUNT(*) INTO polygon_count FROM missing_polygon_anchor_events;
  SELECT COUNT(*) INTO bitcoin_count FROM missing_bitcoin_anchor_events;
  total_count := polygon_count + bitcoin_count;

  -- Report findings
  IF total_count = 0 THEN
    RAISE NOTICE '✅ No dual-write inconsistencies detected';
    RAISE NOTICE 'System is consistent: all confirmed anchors have events[]';
  ELSE
    RAISE WARNING '⚠️  Found % dual-write inconsistencies:', total_count;

    IF polygon_count > 0 THEN
      RAISE WARNING '  - Polygon: % documents missing anchor events', polygon_count;
      RAISE WARNING '    Query: SELECT * FROM missing_polygon_anchor_events LIMIT 10;';
    END IF;

    IF bitcoin_count > 0 THEN
      RAISE WARNING '  - Bitcoin: % documents missing anchor events', bitcoin_count;
      RAISE WARNING '    Query: SELECT * FROM missing_bitcoin_anchor_events LIMIT 10;';
    END IF;

    RAISE WARNING 'Repair: Use Edge Function repair-missing-anchor-events (admin-only)';
    RAISE WARNING 'Summary: SELECT * FROM get_anchor_inconsistency_summary();';
  END IF;

  RAISE NOTICE 'Views created: missing_polygon_anchor_events, missing_bitcoin_anchor_events';
  RAISE NOTICE 'Function created: get_anchor_inconsistency_summary()';
END;
$$;

-- ============================================================================
-- FINAL COMMENT
-- ============================================================================
COMMENT ON SCHEMA public IS
  'EcoSign public schema.

  Dual-write inconsistency monitoring:
  - Views: missing_polygon_anchor_events, missing_bitcoin_anchor_events
  - Function: get_anchor_inconsistency_summary()
  - Repair: Edge Function repair-missing-anchor-events (admin-only)

  These tools expose dual-write gaps where legacy says "confirmed" but events[] is empty.
  The system does NOT auto-repair - repairs are manual and logged.';
