-- ============================================
-- D9 Shadow Views: Cancel Workflow
-- ============================================

-- Vista: Resumen de shadow runs D9
CREATE OR REPLACE VIEW shadow_d9_summary AS
SELECT
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE has_divergence = true) as divergences,
  COUNT(*) FILTER (WHERE has_divergence = false) as matches,
  MIN(created_at) as first_run,
  MAX(created_at) as last_run,
  ROUND(100.0 * COUNT(*) FILTER (WHERE has_divergence = false) / NULLIF(COUNT(*), 0), 2) as match_percentage
FROM shadow_decision_logs
WHERE decision_code = 'D9_CANCEL_WORKFLOW';

COMMENT ON VIEW shadow_d9_summary IS 'D9: Resumen de comparaciones shadow para cancel-workflow';

-- Vista: Últimas divergencias D9
CREATE OR REPLACE VIEW shadow_d9_divergences AS
SELECT
  created_at,
  workflow_id,
  signer_id,
  legacy_decision,
  canonical_decision,
  context
FROM shadow_decision_logs
WHERE decision_code = 'D9_CANCEL_WORKFLOW'
  AND has_divergence = true
ORDER BY created_at DESC
LIMIT 100;

COMMENT ON VIEW shadow_d9_divergences IS 'D9: Últimas 100 divergencias detectadas en cancel-workflow';

-- Verificación de integridad
SELECT * FROM shadow_d9_summary LIMIT 0;
SELECT * FROM shadow_d9_divergences LIMIT 0;
