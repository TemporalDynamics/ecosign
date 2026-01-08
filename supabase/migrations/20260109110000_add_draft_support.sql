-- ========================================
-- Migration: Add Draft Support to Operations
-- Based on: docs/contratos/DRAFT_OPERATION_RULES.md
-- ========================================

-- 1. Update operations.status to include 'draft'
ALTER TABLE operations
  DROP CONSTRAINT IF EXISTS operations_status_check;

ALTER TABLE operations
  ADD CONSTRAINT operations_status_check
  CHECK (status IN ('draft', 'active', 'closed', 'archived'));

-- 2. Add draft-related fields to operation_documents
ALTER TABLE operation_documents
  ADD COLUMN IF NOT EXISTS draft_file_ref TEXT,
  ADD COLUMN IF NOT EXISTS draft_metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Add comment for clarity
COMMENT ON COLUMN operation_documents.draft_file_ref IS 'Encrypted reference to temporary file (only for draft operations)';
COMMENT ON COLUMN operation_documents.draft_metadata IS 'Draft-only metadata: positions, order, notes (cleaned on protection)';

-- 4. Index for filtering draft operations
CREATE INDEX IF NOT EXISTS idx_operations_status_owner
  ON operations(owner_id, status);

-- 5. Function to validate draft transition rules
CREATE OR REPLACE FUNCTION validate_draft_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Cannot go from active/closed/archived back to draft
  IF OLD.status IN ('active', 'closed', 'archived') AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'Cannot revert to draft once operation is protected (status: %)', OLD.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to enforce draft transition rules
DROP TRIGGER IF EXISTS enforce_draft_transition ON operations;
CREATE TRIGGER enforce_draft_transition
  BEFORE UPDATE OF status ON operations
  FOR EACH ROW
  EXECUTE FUNCTION validate_draft_transition();

-- 7. RLS remains the same (already covers draft operations)
-- No changes needed to RLS policies

-- 8. Success message
DO $$
BEGIN
  RAISE NOTICE 'Draft support added successfully';
  RAISE NOTICE 'Draft → Active transition enforced';
  RAISE NOTICE 'Cannot revert to draft once protected';
END
$$;
