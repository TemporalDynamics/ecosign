-- =====================================================
-- Migration: Add protection_level and polygon_status
-- =====================================================
-- Implements the 3-tier protection model:
-- - ACTIVE: Certificate created + TSA confirmed
-- - REINFORCED: Polygon anchor confirmed
-- - TOTAL: Bitcoin anchor confirmed

-- Add protection_level column
ALTER TABLE user_documents
  ADD COLUMN IF NOT EXISTS protection_level TEXT DEFAULT 'ACTIVE'
    CHECK (protection_level IN ('ACTIVE', 'REINFORCED', 'TOTAL'));

-- Add polygon_status column (mirrors bitcoin_status)
ALTER TABLE user_documents
  ADD COLUMN IF NOT EXISTS polygon_status TEXT
    CHECK (polygon_status IS NULL OR polygon_status IN ('pending', 'confirmed', 'failed'));

-- Add polygon_confirmed_at timestamp
ALTER TABLE user_documents
  ADD COLUMN IF NOT EXISTS polygon_confirmed_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_documents_protection_level
  ON user_documents(protection_level);

CREATE INDEX IF NOT EXISTS idx_user_documents_polygon_status
  ON user_documents(polygon_status)
  WHERE polygon_status IS NOT NULL;

-- Comments
COMMENT ON COLUMN user_documents.protection_level IS 'ACTIVE (TSA confirmed), REINFORCED (Polygon confirmed), TOTAL (Bitcoin confirmed)';
COMMENT ON COLUMN user_documents.polygon_status IS 'Polygon anchoring status: pending, confirmed, failed';
COMMENT ON COLUMN user_documents.polygon_confirmed_at IS 'Timestamp when Polygon anchor was confirmed';

-- Backfill protection_level for existing records
-- If bitcoin confirmed -> TOTAL
-- If polygon confirmed -> REINFORCED
-- Else -> ACTIVE (default)
UPDATE user_documents
SET protection_level = CASE
  WHEN bitcoin_status = 'confirmed' THEN 'TOTAL'
  WHEN has_polygon_anchor = true THEN 'REINFORCED'
  ELSE 'ACTIVE'
END
WHERE protection_level IS NULL OR protection_level = 'ACTIVE';
