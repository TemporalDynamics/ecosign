-- Verificación EPI pre-canary con doble scope:
-- 1) hard gate post-freeze (bloqueante)
-- 2) deuda histórica (no bloqueante por defecto)
--
-- Uso recomendado:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/verify_precanary_epi.sql
--
-- Opcional: cambiar fecha de freeze
-- psql "$DATABASE_URL" -v freeze_since="'2026-02-19T00:00:00Z'" -f scripts/db/verify_precanary_epi.sql

\if :{?freeze_since}
\else
\set freeze_since '''2026-02-19T00:00:00Z'''
\endif

\echo === EPI Precanary: Hard Gate (post_freeze) ===
WITH params AS (
    SELECT (:freeze_since)::timestamptz AS freeze_since
)
SELECT
    'completed_workflow_requires_signed_witness' AS check_name,
    COUNT(*)::int AS violations
FROM signature_workflows sw
LEFT JOIN document_entities de ON de.id = sw.document_entity_id
JOIN params p ON TRUE
WHERE sw.status = 'completed'
  AND sw.completed_at >= p.freeze_since
  AND (
      sw.document_entity_id IS NULL
      OR de.witness_current_storage_path IS NULL
      OR de.witness_current_storage_path = ''
      OR de.witness_current_storage_path NOT LIKE 'signed/%'
  )
UNION ALL
SELECT
    'workflow_completed_event_requires_signed_witness' AS check_name,
    COUNT(*)::int AS violations
FROM workflow_events we
JOIN signature_workflows sw ON sw.id = we.workflow_id
LEFT JOIN document_entities de ON de.id = sw.document_entity_id
JOIN params p ON TRUE
WHERE we.event_type = 'workflow.completed'
  AND we.created_at >= p.freeze_since
  AND (
      sw.document_entity_id IS NULL
      OR de.witness_current_storage_path IS NULL
      OR de.witness_current_storage_path = ''
      OR de.witness_current_storage_path NOT LIKE 'signed/%'
  );

\echo === EPI Precanary: Historical Debt (report-only) ===
SELECT
    'completed_workflow_requires_signed_witness' AS check_name,
    COUNT(*)::int AS violations
FROM signature_workflows sw
LEFT JOIN document_entities de ON de.id = sw.document_entity_id
WHERE sw.status = 'completed'
  AND (
      sw.document_entity_id IS NULL
      OR de.witness_current_storage_path IS NULL
      OR de.witness_current_storage_path = ''
      OR de.witness_current_storage_path NOT LIKE 'signed/%'
  )
UNION ALL
SELECT
    'workflow_completed_event_requires_signed_witness' AS check_name,
    COUNT(*)::int AS violations
FROM workflow_events we
JOIN signature_workflows sw ON sw.id = we.workflow_id
LEFT JOIN document_entities de ON de.id = sw.document_entity_id
WHERE we.event_type = 'workflow.completed'
  AND (
      sw.document_entity_id IS NULL
      OR de.witness_current_storage_path IS NULL
      OR de.witness_current_storage_path = ''
      OR de.witness_current_storage_path NOT LIKE 'signed/%'
  )
UNION ALL
SELECT
    'duplicate_workflow_notifications' AS check_name,
    COUNT(*)::int AS violations
FROM (
    SELECT workflow_id, signer_id, notification_type, step
    FROM workflow_notifications
    GROUP BY workflow_id, signer_id, notification_type, step
    HAVING COUNT(*) > 1
) t
UNION ALL
SELECT
    'signed_witness_without_user_document' AS check_name,
    COUNT(*)::int AS violations
FROM document_entities de
WHERE de.witness_current_storage_path LIKE 'signed/%'
  AND NOT EXISTS (
      SELECT 1
      FROM user_documents ud
      WHERE ud.document_entity_id = de.id
  )
UNION ALL
SELECT
    'signed_user_document_without_matching_document_entity' AS check_name,
    COUNT(*)::int AS violations
FROM user_documents ud
WHERE COALESCE(ud.pdf_storage_path, ud.encrypted_path) LIKE 'signed/%'
  AND NOT EXISTS (
      SELECT 1
      FROM document_entities de
      WHERE de.witness_current_storage_path = COALESCE(ud.pdf_storage_path, ud.encrypted_path)
  );
