-- =====================================================
-- Function: upgrade_protection_level()
-- =====================================================
-- Upgrades protection_level based on confirmed blockchain anchors
-- CRITICAL RULE: protection_level can ONLY increase, NEVER decrease
--
-- Levels:
-- - ACTIVE: Base protection (TSA confirmed)
-- - REINFORCED: Polygon anchor confirmed
-- - TOTAL: Bitcoin anchor confirmed
--
-- Invariants:
-- 1. ACTIVE → REINFORCED → TOTAL (only upward)
-- 2. If bitcoin_status='confirmed' → always TOTAL
-- 3. If polygon_status='confirmed' AND bitcoin_status!='confirmed' → REINFORCED
-- 4. NEVER downgrade level

CREATE OR REPLACE FUNCTION upgrade_protection_level(doc_id UUID)
RETURNS void AS $$
DECLARE
  current_level TEXT;
  bitcoin_confirmed BOOLEAN;
  polygon_confirmed BOOLEAN;
BEGIN
  -- Get current state
  SELECT
    protection_level,
    bitcoin_status = 'confirmed',
    polygon_status = 'confirmed'
  INTO current_level, bitcoin_confirmed, polygon_confirmed
  FROM user_documents
  WHERE id = doc_id;

  -- Early return if document doesn't exist
  IF NOT FOUND THEN
    RAISE NOTICE 'Document % not found', doc_id;
    RETURN;
  END IF;

  -- UPGRADE RULE 1: Bitcoin confirmed → TOTAL (highest level)
  -- Only upgrade if not already TOTAL
  IF bitcoin_confirmed AND current_level != 'TOTAL' THEN
    UPDATE user_documents
    SET
      protection_level = 'TOTAL',
      updated_at = NOW()
    WHERE id = doc_id;

    RAISE NOTICE 'Document % upgraded to TOTAL (Bitcoin confirmed)', doc_id;
    RETURN;
  END IF;

  -- UPGRADE RULE 2: Polygon confirmed (but not Bitcoin) → REINFORCED
  -- Only upgrade if currently ACTIVE (never downgrade from TOTAL)
  IF polygon_confirmed AND NOT bitcoin_confirmed AND current_level = 'ACTIVE' THEN
    UPDATE user_documents
    SET
      protection_level = 'REINFORCED',
      updated_at = NOW()
    WHERE id = doc_id;

    RAISE NOTICE 'Document % upgraded to REINFORCED (Polygon confirmed)', doc_id;
    RETURN;
  END IF;

  -- INVARIANT CHECK: Never downgrade
  -- This should never happen, but defensive programming
  IF (current_level = 'TOTAL' AND (polygon_confirmed OR bitcoin_confirmed)) OR
     (current_level = 'REINFORCED' AND polygon_confirmed) THEN
    -- Already at correct or higher level, no action needed
    RAISE NOTICE 'Document % already at correct level: %', doc_id, current_level;
    RETURN;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION upgrade_protection_level(UUID) IS
  'Upgrades protection_level based on confirmed blockchain anchors. NEVER downgrades.';

-- Grant execute to authenticated users (will be called by workers)
GRANT EXECUTE ON FUNCTION upgrade_protection_level(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upgrade_protection_level(UUID) TO service_role;

-- =====================================================
-- Test cases (can be run manually for validation)
-- =====================================================

-- Test 1: ACTIVE → REINFORCED (Polygon confirmed)
-- INSERT INTO user_documents (user_id, document_name, protection_level, polygon_status)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'test1.pdf', 'ACTIVE', 'confirmed');
-- SELECT upgrade_protection_level(id) FROM user_documents WHERE document_name = 'test1.pdf';
-- Expected: protection_level = 'REINFORCED'

-- Test 2: ACTIVE → TOTAL (Bitcoin confirmed)
-- INSERT INTO user_documents (user_id, document_name, protection_level, bitcoin_status)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'test2.pdf', 'ACTIVE', 'confirmed');
-- SELECT upgrade_protection_level(id) FROM user_documents WHERE document_name = 'test2.pdf';
-- Expected: protection_level = 'TOTAL'

-- Test 3: REINFORCED → TOTAL (Bitcoin confirmed)
-- INSERT INTO user_documents (user_id, document_name, protection_level, polygon_status, bitcoin_status)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'test3.pdf', 'REINFORCED', 'confirmed', 'confirmed');
-- SELECT upgrade_protection_level(id) FROM user_documents WHERE document_name = 'test3.pdf';
-- Expected: protection_level = 'TOTAL'

-- Test 4: TOTAL → TOTAL (idempotent, no downgrade)
-- INSERT INTO user_documents (user_id, document_name, protection_level, bitcoin_status)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'test4.pdf', 'TOTAL', 'confirmed');
-- SELECT upgrade_protection_level(id) FROM user_documents WHERE document_name = 'test4.pdf';
-- Expected: protection_level = 'TOTAL' (no change)
