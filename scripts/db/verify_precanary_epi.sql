-- Pre-Canary EPI invariant checks
-- Expected result for every query: 0

-- 1) witness_current_storage_path must always point to immutable signed/*
SELECT COUNT(*)::int AS non_signed_witness_path
FROM document_entities
WHERE witness_current_storage_path IS NOT NULL
  AND witness_current_storage_path NOT LIKE 'signed/%';

-- 2) workflow.completed must not exist without immutable witness path
SELECT COUNT(*)::int AS completed_without_immutable_witness
FROM workflow_events we
JOIN document_entities de ON de.id = we.document_entity_id
WHERE we.event_type = 'workflow.completed'
  AND (
    de.witness_current_storage_path IS NULL
    OR de.witness_current_storage_path NOT LIKE 'signed/%'
  );
