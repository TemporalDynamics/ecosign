-- Deduplicate historical signer.signed events before enforcing uniqueness.
-- Keep the earliest event per (workflow_id, signer_id), remove the rest.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY workflow_id, signer_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM workflow_events
  WHERE event_type = 'signer.signed'
)
DELETE FROM workflow_events we
USING ranked r
WHERE we.id = r.id
  AND r.rn > 1;

-- Enforce idempotency at DB level for signer.signed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_signer_signed
ON workflow_events (workflow_id, signer_id)
WHERE event_type = 'signer.signed';
