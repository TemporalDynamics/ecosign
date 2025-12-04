-- Add timestamp for SignNow embed URL creation
-- This allows us to detect and regenerate expired URLs

ALTER TABLE workflow_signers
ADD COLUMN IF NOT EXISTS signnow_embed_created_at TIMESTAMPTZ;

-- Index for performance when checking expiration
CREATE INDEX IF NOT EXISTS idx_workflow_signers_embed_created
ON workflow_signers(signnow_embed_created_at)
WHERE signnow_embed_url IS NOT NULL;

-- Comment
COMMENT ON COLUMN workflow_signers.signnow_embed_created_at IS
'Timestamp when the SignNow embed URL was created. Used to detect and regenerate expired URLs (24h TTL).';
