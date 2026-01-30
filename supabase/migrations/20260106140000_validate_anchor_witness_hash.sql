-- Migration: Validate Anchor Witness Hash Consistency
-- Created: 2026-01-06
-- Priority: P0.1 (CRÍTICO - Previene corrupción probatoria)
--
-- Purpose: Enforce witness_hash consistency for anchor events
-- Contract: docs/contratos/ANCHOR_EVENT_RULES.md
--
-- Gap cerrado: Actualmente TSA valida witness_hash, pero anchors NO.
-- Esto permite eventos probatoriamente falsos en el ledger.
--
-- Solución: Agregar validación simétrica para anchors.

-- ============================================================================
-- 1. VALIDATION FUNCTION: Anchor Events
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_anchor_event(event jsonb)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- MUST: kind = "anchor"
  IF event->>'kind' != 'anchor' THEN
    RAISE EXCEPTION 'Anchor event must have kind="anchor"';
  END IF;

  -- MUST: at (ISO 8601 timestamp)
  IF event->>'at' IS NULL OR event->>'at' = '' THEN
    RAISE EXCEPTION 'Anchor event must have "at" timestamp';
  END IF;

  -- MUST: anchor object
  IF event->'anchor' IS NULL THEN
    RAISE EXCEPTION 'Anchor event must have "anchor" object';
  END IF;

  -- MUST: anchor.network (closed enum)
  IF event->'anchor'->>'network' IS NULL THEN
    RAISE EXCEPTION 'Anchor event must have anchor.network';
  END IF;

  IF event->'anchor'->>'network' NOT IN ('polygon', 'bitcoin') THEN
    RAISE EXCEPTION 'Anchor network must be "polygon" or "bitcoin", got: %',
      event->'anchor'->>'network';
  END IF;

  -- MUST: anchor.witness_hash (canonical reference)
  IF event->'anchor'->>'witness_hash' IS NULL OR event->'anchor'->>'witness_hash' = '' THEN
    RAISE EXCEPTION 'Anchor event must have anchor.witness_hash';
  END IF;

  -- MUST: anchor.txid (blockchain transaction ID)
  IF event->'anchor'->>'txid' IS NULL OR event->'anchor'->>'txid' = '' THEN
    RAISE EXCEPTION 'Anchor event must have anchor.txid';
  END IF;

  -- MUST: anchor.confirmed_at (confirmation timestamp)
  IF event->'anchor'->>'confirmed_at' IS NULL OR event->'anchor'->>'confirmed_at' = '' THEN
    RAISE EXCEPTION 'Anchor event must have anchor.confirmed_at';
  END IF;

  -- SHOULD: block_height (not enforced as MUST, but recommended)
  -- If present, should be positive integer
  IF event->'anchor'->'block_height' IS NOT NULL THEN
    IF (event->'anchor'->>'block_height')::int <= 0 THEN
      RAISE EXCEPTION 'Anchor block_height must be positive, got: %',
        event->'anchor'->>'block_height';
    END IF;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION validate_anchor_event(jsonb) IS
  'Validates structure of anchor events before insertion into events[]. '
  'Enforces: kind, timestamp, network enum, witness_hash, txid, confirmed_at. '
  'Contract: docs/contratos/ANCHOR_EVENT_RULES.md';

-- ============================================================================
-- 2. UPDATE TRIGGER: Add Anchor Validation
-- ============================================================================
CREATE OR REPLACE FUNCTION enforce_events_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_len INTEGER;
  new_len INTEGER;
  new_event jsonb;
  event_kind TEXT;
BEGIN
  -- Check append-only invariant
  old_len := jsonb_array_length(OLD.events);
  new_len := jsonb_array_length(NEW.events);

  IF new_len < old_len THEN
    RAISE EXCEPTION 'events[] is append-only: cannot shrink';
  END IF;

  -- If length increased, validate new events
  IF new_len > old_len THEN
    FOR i IN old_len..(new_len - 1) LOOP
      new_event := NEW.events->i;
      event_kind := new_event->>'kind';

      -- Validate TSA events
      IF event_kind IN ('tsa', 'tsa.confirmed') THEN
        PERFORM validate_tsa_event(new_event);

        -- 🔒 CRITICAL: witness_hash must match document witness_hash
        IF new_event->>'witness_hash' != NEW.witness_hash THEN
          RAISE EXCEPTION 'TSA event witness_hash (%) must match document witness_hash (%)',
            new_event->>'witness_hash', NEW.witness_hash;
        END IF;
      END IF;

      -- ✅ NEW: Validate Anchor events
      IF event_kind = 'anchor' THEN
        PERFORM validate_anchor_event(new_event);

        -- 🔒 CRITICAL: witness_hash must match document witness_hash
        IF new_event->'anchor'->>'witness_hash' != NEW.witness_hash THEN
          RAISE EXCEPTION 'Anchor event witness_hash (%) must match document witness_hash (%)',
            new_event->'anchor'->>'witness_hash', NEW.witness_hash;
        END IF;
      END IF;

      -- Future: validate external_signature events, etc.
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION enforce_events_append_only() IS
  'Enforces append-only invariant for events[] and validates event structure. '
  'Validates: TSA events (structure + witness_hash consistency), '
  'Anchor events (structure + witness_hash consistency). '
  'Contract: docs/contratos/TSA_EVENT_RULES.md, ANCHOR_EVENT_RULES.md';

-- ============================================================================
-- 3. VALIDATION: Check Existing Data
-- ============================================================================
-- Verify that existing anchor events (if any) comply with new validation

DO $$
DECLARE
  invalid_count INTEGER;
  doc_id UUID;
  event_data jsonb;
BEGIN
  -- Check for anchor events with mismatched witness_hash
  SELECT COUNT(DISTINCT de.id)
  INTO invalid_count
  FROM document_entities de,
       jsonb_array_elements(de.events) event
  WHERE event->>'kind' = 'anchor'
    AND event->'anchor'->>'witness_hash' != de.witness_hash;

  IF invalid_count > 0 THEN
    -- Log details of invalid documents
    FOR doc_id, event_data IN
      SELECT de.id, event
      FROM document_entities de,
           jsonb_array_elements(de.events) event
      WHERE event->>'kind' = 'anchor'
        AND event->'anchor'->>'witness_hash' != de.witness_hash
      LIMIT 5
    LOOP
      RAISE WARNING 'Document % has anchor with mismatched witness_hash: %',
        doc_id, event_data->'anchor'->>'witness_hash';
    END LOOP;

    RAISE EXCEPTION 'Found % documents with anchor witness_hash mismatch. Fix before applying migration.',
      invalid_count;
  END IF;

  -- Check for anchor events with invalid structure
  SELECT COUNT(DISTINCT de.id)
  INTO invalid_count
  FROM document_entities de,
       jsonb_array_elements(de.events) event
  WHERE event->>'kind' = 'anchor'
    AND (
      event->'anchor' IS NULL
      OR event->'anchor'->>'network' IS NULL
      OR event->'anchor'->>'network' NOT IN ('polygon', 'bitcoin')
      OR event->'anchor'->>'witness_hash' IS NULL
      OR event->'anchor'->>'txid' IS NULL
      OR event->'anchor'->>'confirmed_at' IS NULL
    );

  IF invalid_count > 0 THEN
    RAISE WARNING 'Found % documents with malformed anchor events - these will fail validation',
      invalid_count;
  END IF;

  RAISE NOTICE '✅ Validation passed. No anchor events with witness_hash mismatch found.';
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
  '4. TSA witness_hash consistency (enforced) '
  '5. Anchor witness_hash consistency (enforced) ✅ NEW '
  'Contracts: ANCHOR_EVENT_RULES.md, PROTECTION_LEVEL_RULES.md, TSA_EVENT_RULES.md';
