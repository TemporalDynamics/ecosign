-- Migration: Fix link-recipient attribution bug
-- Problem: verify-access was picking the last recipient for a document instead of the specific recipient for the token
-- Solution: Add recipient_id to links table to create direct relationship

-- Add recipient_id column to links table
ALTER TABLE links ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES recipients(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_links_recipient_id ON links(recipient_id);

COMMENT ON COLUMN links.recipient_id IS 'Direct reference to the recipient this link was generated for';

-- Update existing links to associate with most recent recipient (best effort)
-- This is a one-time fix for existing data
UPDATE links l
SET recipient_id = (
  SELECT r.id
  FROM recipients r
  WHERE r.document_id = l.document_id
  ORDER BY r.created_at DESC
  LIMIT 1
)
WHERE l.recipient_id IS NULL;
