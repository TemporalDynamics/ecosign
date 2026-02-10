-- NDA acceptance consistency check (audit-only)
-- Returns rows that violate: NDA accepted without audit-grade nda.accepted event + nda_hash

SELECT ws.id AS signer_id, ws.workflow_id
FROM workflow_signers ws
WHERE ws.nda_accepted = true
  AND NOT EXISTS (
    SELECT 1
    FROM ecox_audit_trail e
    WHERE e.signer_id = ws.id
      AND e.event_type = 'nda.accepted'
      AND e.details->>'nda_hash' IS NOT NULL
  );
