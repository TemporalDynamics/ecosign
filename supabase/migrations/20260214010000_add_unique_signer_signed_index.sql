-- Add unique partial index to prevent duplicate signer.signed events
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_signer_signed
ON workflow_events (workflow_id, signer_id)
WHERE event_type = 'signer.signed';