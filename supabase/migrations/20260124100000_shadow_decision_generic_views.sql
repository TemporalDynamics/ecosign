-- Generic shadow decision views (cross-decision)

CREATE OR REPLACE VIEW shadow_decision_summary AS
SELECT
  decision_code,
  COUNT(*) AS total_runs,
  COUNT(*) FILTER (WHERE has_divergence) AS divergences,
  COUNT(*) FILTER (WHERE NOT has_divergence) AS matches,
  MIN(created_at) AS first_run,
  MAX(created_at) AS last_run,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE NOT has_divergence) / NULLIF(COUNT(*), 0),
    2
  ) AS match_percentage
FROM shadow_decision_logs
GROUP BY decision_code
ORDER BY decision_code;

COMMENT ON VIEW shadow_decision_summary IS 'Resumen global de comparaciones shadow por decision_code';

CREATE OR REPLACE VIEW shadow_decision_last_runs AS
SELECT
  created_at,
  decision_code,
  legacy_decision,
  canonical_decision,
  has_divergence,
  workflow_id,
  signer_id,
  context
FROM shadow_decision_logs
ORDER BY created_at DESC;

COMMENT ON VIEW shadow_decision_last_runs IS 'Ultimas ejecuciones shadow (ordenadas por created_at DESC)';

CREATE OR REPLACE VIEW shadow_decision_divergences AS
SELECT
  created_at,
  decision_code,
  legacy_decision,
  canonical_decision,
  workflow_id,
  signer_id,
  context
FROM shadow_decision_logs
WHERE has_divergence = true
ORDER BY created_at DESC;

COMMENT ON VIEW shadow_decision_divergences IS 'Divergencias shadow (has_divergence = true)';

SELECT * FROM shadow_decision_summary LIMIT 0;
