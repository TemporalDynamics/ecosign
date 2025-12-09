-- Migration: Add UNIQUE constraint to prevent duplicate anchors
-- This ensures idempotent retries and prevents processing the same hash+type multiple times
-- Future-ready: Supports EVM generic architecture with optional chain_id

-- Step 1: Remove any existing duplicate anchors (keep oldest one per hash+type)
-- This is safe because we want to prevent duplicates going forward

-- First, identify duplicates
CREATE TEMP TABLE duplicate_anchors AS
SELECT
  document_hash,
  anchor_type,
  MIN(created_at) as first_created_at
FROM anchors
GROUP BY document_hash, anchor_type
HAVING COUNT(*) > 1;

-- Delete duplicates (keep the oldest one)
DELETE FROM anchors
WHERE id IN (
  SELECT a.id
  FROM anchors a
  INNER JOIN duplicate_anchors d
    ON a.document_hash = d.document_hash
    AND a.anchor_type = d.anchor_type
  WHERE a.created_at > d.first_created_at
);

-- Step 2: Add UNIQUE constraint
-- This prevents duplicate anchors for the same hash+type combination
ALTER TABLE anchors
ADD CONSTRAINT unique_document_anchor
UNIQUE (document_hash, anchor_type);

-- Step 3: Add comment for documentation
COMMENT ON CONSTRAINT unique_document_anchor ON anchors IS
'Prevents duplicate anchors for the same document hash and anchor type. Enables idempotent retries using ON CONFLICT DO UPDATE.';

-- Note: For future EVM generic architecture, consider:
-- UNIQUE (document_hash, anchor_type, evm_chain_id)
-- This would allow same hash to be anchored on multiple EVM chains
