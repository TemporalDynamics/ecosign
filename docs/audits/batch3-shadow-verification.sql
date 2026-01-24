-- Bache 3 (D20–D22) — Paquete de verificacion shadow

-- Resumen por decision (D20–D22)
SELECT *
FROM shadow_decision_summary
WHERE decision_code IN (
  'D20_RECOVER_POLYGON',
  'D20_RECOVER_BITCOIN',
  'D21_CONFIRM_POLYGON',
  'D22_SUBMIT_BITCOIN',
  'D22_CONFIRM_BITCOIN'
)
ORDER BY decision_code;

-- Ultimos 50 runs (D20–D22)
SELECT *
FROM shadow_decision_last_runs
WHERE decision_code IN (
  'D20_RECOVER_POLYGON',
  'D20_RECOVER_BITCOIN',
  'D21_CONFIRM_POLYGON',
  'D22_SUBMIT_BITCOIN',
  'D22_CONFIRM_BITCOIN'
)
ORDER BY created_at DESC
LIMIT 50;

-- Divergencias (si aparecen)
SELECT *
FROM shadow_decision_divergences
WHERE decision_code IN (
  'D20_RECOVER_POLYGON',
  'D20_RECOVER_BITCOIN',
  'D21_CONFIRM_POLYGON',
  'D22_SUBMIT_BITCOIN',
  'D22_CONFIRM_BITCOIN'
)
ORDER BY created_at DESC;
