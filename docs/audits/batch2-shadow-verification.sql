-- Bache 2 (D16–D19) — Paquete de verificacion shadow

-- Resumen por decision (D16–D19)
SELECT *
FROM shadow_decision_summary
WHERE decision_code IN (
  'D16_ACCEPT_NDA',
  'D17_ACCEPT_WORKFLOW_NDA',
  'D18_ACCEPT_INVITE_NDA',
  'D19_ACCEPT_SHARE_NDA'
)
ORDER BY decision_code;

-- Ultimos 50 runs (D16–D19)
SELECT *
FROM shadow_decision_last_runs
WHERE decision_code IN (
  'D16_ACCEPT_NDA',
  'D17_ACCEPT_WORKFLOW_NDA',
  'D18_ACCEPT_INVITE_NDA',
  'D19_ACCEPT_SHARE_NDA'
)
ORDER BY created_at DESC
LIMIT 50;

-- Divergencias (si aparecen)
SELECT *
FROM shadow_decision_divergences
WHERE decision_code IN (
  'D16_ACCEPT_NDA',
  'D17_ACCEPT_WORKFLOW_NDA',
  'D18_ACCEPT_INVITE_NDA',
  'D19_ACCEPT_SHARE_NDA'
)
ORDER BY created_at DESC;
