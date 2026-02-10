-- Audit-only view: NDA consistency between workflow_signers and ecox_audit_trail
-- Purpose: observability and external audit support (no runtime impact)

CREATE OR REPLACE VIEW public.audit_nda_consistency AS
SELECT
  ws.id AS signer_id,
  ws.workflow_id,
  ws.nda_accepted,
  ws.nda_accepted_at,
  e.id AS nda_event_id,
  e.details->>'nda_hash' AS nda_hash,
  e.details->>'nda_version' AS nda_version,
  CASE
    WHEN ws.nda_accepted = false THEN 'not_applicable'
    WHEN e.id IS NULL THEN 'missing_event'
    WHEN e.details->>'nda_hash' IS NULL THEN 'missing_hash'
    ELSE 'ok'
  END AS status
FROM public.workflow_signers ws
LEFT JOIN public.ecox_audit_trail e
  ON e.signer_id = ws.id
 AND e.event_type = 'nda.accepted';

COMMENT ON VIEW public.audit_nda_consistency IS 'Audit-only view for NDA acceptance consistency (no enforcement).';
