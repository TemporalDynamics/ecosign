-- Bache 1 (D12–D15) — Paquete de verificacion shadow

-- Resumen por decision (D12–D15)
SELECT *
FROM shadow_decision_summary
WHERE decision_code IN (
  'D12_APPLY_SIGNER_SIGNATURE',
  'D13_START_SIGNATURE_WORKFLOW',
  'D14_REQUEST_DOCUMENT_CHANGES',
  'D15_RESPOND_TO_CHANGES'
)
ORDER BY decision_code;

-- Ultimos 50 runs (D12–D15)
SELECT *
FROM shadow_decision_last_runs
WHERE decision_code IN (
  'D12_APPLY_SIGNER_SIGNATURE',
  'D13_START_SIGNATURE_WORKFLOW',
  'D14_REQUEST_DOCUMENT_CHANGES',
  'D15_RESPOND_TO_CHANGES'
)
ORDER BY created_at DESC
LIMIT 50;

-- Divergencias (si aparecen)
SELECT *
FROM shadow_decision_divergences
WHERE decision_code IN (
  'D12_APPLY_SIGNER_SIGNATURE',
  'D13_START_SIGNATURE_WORKFLOW',
  'D14_REQUEST_DOCUMENT_CHANGES',
  'D15_RESPOND_TO_CHANGES'
)
ORDER BY created_at DESC;
