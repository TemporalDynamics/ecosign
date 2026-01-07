-- Migration: Harden document_entities.events[] Canonical Invariants
-- Created: 2026-01-06
-- Purpose: DB-level enforcement of probative integrity rules
--
-- Contract: docs/contratos/ANCHOR_EVENT_RULES.md, PROTECTION_LEVEL_RULES.md
--
-- Scope:
-- 1. events[] must be JSONB array (not object/null)
-- 2. events[] is append-only (no shrink)
-- 3. Anchor network uniqueness (max 1 per network)
-- 4. Indexes for probative queries
--
-- NOT touching: UI, workers, helpers, contracts

-- ============================================================================
-- 1. CONSTRAINT: events must be array
-- ============================================================================
-- Prevent corruption: events must be NULL or a JSONB array, never object/string
ALTER TABLE document_entities
ADD CONSTRAINT events_is_array
CHECK (
  events IS NULL
  OR jsonb_typeof(events) = 'array'
);

COMMENT ON CONSTRAINT events_is_array ON document_entities IS
  'Ensures events[] is always a JSONB array, preventing corruption. '
  'Contract: append-only event ledger requires array structure.';

-- ============================================================================
-- 2. CONSTRAINT: events[] is append-only (no shrink)
-- ============================================================================
-- Prevent accidental deletion: array length can only increase, never decrease
CREATE OR REPLACE FUNCTION enforce_events_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only check if both OLD and NEW have events
  IF OLD.events IS NOT NULL AND NEW.events IS NOT NULL THEN
    -- Reject if array length decreased (shrink = corruption)
    IF jsonb_array_length(NEW.events) < jsonb_array_length(OLD.events) THEN
      RAISE EXCEPTION 'events[] is append-only: cannot remove events (old=%, new=%)',
        jsonb_array_length(OLD.events),
        jsonb_array_length(NEW.events);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_events_append_only
BEFORE UPDATE OF events ON document_entities
FOR EACH ROW
EXECUTE FUNCTION enforce_events_append_only();

COMMENT ON FUNCTION enforce_events_append_only() IS
  'Enforces append-only invariant: events[] array length can only grow, never shrink. '
  'Prevents accidental corruption by blocking DELETE from events[]. '
  'Contract: probative ledger must be immutable (append-only).';

-- ============================================================================
-- 3. CONSTRAINT: Anchor network uniqueness (max 1 per network per document)
-- ============================================================================
-- Prevent duplicate anchors: same network cannot appear twice in events[]
CREATE OR REPLACE FUNCTION validate_anchor_uniqueness()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  networks text[];
  unique_count int;
  total_count int;
BEGIN
  -- Extract all anchor networks from events[]
  SELECT array_agg(e->'anchor'->>'network')
  INTO networks
  FROM jsonb_array_elements(NEW.events) e
  WHERE e->>'kind' = 'anchor';

  IF networks IS NOT NULL THEN
    total_count := array_length(networks, 1);

    -- Count unique networks
    SELECT COUNT(DISTINCT n)
    INTO unique_count
    FROM unnest(networks) n;

    -- Reject if duplicate network detected
    IF total_count != unique_count THEN
      RAISE EXCEPTION 'Duplicate anchor network detected in events[]: only 1 anchor per network allowed (found: %)',
        networks;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_anchor_network_unique
BEFORE INSERT OR UPDATE OF events ON document_entities
FOR EACH ROW
EXECUTE FUNCTION validate_anchor_uniqueness();

COMMENT ON FUNCTION validate_anchor_uniqueness() IS
  'Enforces anchor network uniqueness: max 1 anchor per network (polygon/bitcoin) per document. '
  'Prevents corruption from retry bugs or dual-write conflicts. '
  'Contract: ANCHOR_EVENT_RULES.md - "Max 1 anchor per network" invariant.';

-- ============================================================================
-- 4. INDEXES: Probative query performance
-- ============================================================================

-- 4.1 GIN index on events[] for fast searches
-- Accelerates: TSA lookup, anchor lookup, kind filtering
CREATE INDEX IF NOT EXISTS idx_document_entities_events_gin
ON document_entities
USING GIN (events);

COMMENT ON INDEX idx_document_entities_events_gin IS
  'GIN index for fast queries on events[] JSONB. '
  'Accelerates: TSA search, anchor search, kind filtering, audit queries.';

-- 4.2 Functional index: anchor events only (optional but useful)
-- Accelerates: anchor-specific queries, dashboard filters
CREATE INDEX IF NOT EXISTS idx_document_entities_anchor_events
ON document_entities
USING GIN (
  (jsonb_path_query_array(events, '$[*] ? (@.kind == "anchor")'))
);

COMMENT ON INDEX idx_document_entities_anchor_events IS
  'Functional GIN index for anchor events only. '
  'Accelerates: anchor filtering, protection level dashboards, audit queries.';

-- ============================================================================
-- 5. VALIDATION: Existing data
-- ============================================================================
-- Check that existing data complies with new constraints
-- This should not fail if dual-write was done correctly

DO $$
DECLARE
  invalid_count int;
BEGIN
  -- Check for non-array events
  SELECT COUNT(*)
  INTO invalid_count
  FROM document_entities
  WHERE events IS NOT NULL AND jsonb_typeof(events) != 'array';

  IF invalid_count > 0 THEN
    RAISE WARNING 'Found % documents with non-array events[] - these will fail constraint', invalid_count;
  END IF;

  -- Check for duplicate anchor networks
  SELECT COUNT(*)
  INTO invalid_count
  FROM document_entities de
  WHERE (
    SELECT COUNT(e->'anchor'->>'network')
    FROM jsonb_array_elements(de.events) e
    WHERE e->>'kind' = 'anchor'
  ) != (
    SELECT COUNT(DISTINCT e->'anchor'->>'network')
    FROM jsonb_array_elements(de.events) e
    WHERE e->>'kind' = 'anchor'
  );

  IF invalid_count > 0 THEN
    RAISE WARNING 'Found % documents with duplicate anchor networks - these will fail constraint', invalid_count;
  END IF;

  RAISE NOTICE 'Validation complete. Ready for canonical invariants enforcement.';
END;
$$;

-- ============================================================================
-- FINAL COMMENT
-- ============================================================================
COMMENT ON TABLE document_entities IS
  'Canonical document entities with probative event ledger. '
  'events[] is append-only JSONB array with DB-enforced invariants: '
  '1. Must be array (not object/null) '
  '2. Append-only (no shrink) '
  '3. Max 1 anchor per network '
  'Contracts: ANCHOR_EVENT_RULES.md, PROTECTION_LEVEL_RULES.md, TSA_EVENT_RULES.md';
