-- Migration: Fix validate_tsa_event kind allowlist
-- Date: 2026-01-30
-- Purpose: Repair DB drift where validate_tsa_event only allows kind='tsa'.
--
-- Canonical policy:
-- - Writers emit kind='tsa.confirmed'
-- - DB accepts both 'tsa' and 'tsa.confirmed' to tolerate historical data.

CREATE OR REPLACE FUNCTION validate_tsa_event(event jsonb)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- MUST: kind = "tsa" or "tsa.confirmed"
  IF event->>'kind' NOT IN ('tsa', 'tsa.confirmed') THEN
    RAISE EXCEPTION 'TSA event must have kind="tsa" or kind="tsa.confirmed"';
  END IF;

  -- MUST: at
  IF event->>'at' IS NULL OR event->>'at' = '' THEN
    RAISE EXCEPTION 'TSA event must have "at" timestamp';
  END IF;

  -- MUST: witness_hash
  IF event->>'witness_hash' IS NULL OR event->>'witness_hash' = '' THEN
    RAISE EXCEPTION 'TSA event must have "witness_hash"';
  END IF;

  -- MUST: tsa object
  IF event->'tsa' IS NULL THEN
    RAISE EXCEPTION 'TSA event must have "tsa" object';
  END IF;

  -- MUST: tsa.token_b64
  IF event->'tsa'->>'token_b64' IS NULL OR event->'tsa'->>'token_b64' = '' THEN
    RAISE EXCEPTION 'TSA event must have tsa.token_b64';
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION validate_tsa_event(jsonb) IS
  'Validates TSA evidence events. Accepts kinds tsa/tsa.confirmed for backward compatibility; canonical writers emit tsa.confirmed.';
