-- Ensure workflow.completed is emitted at most once per workflow.
-- 1) Normalize historical duplicates (if any), keeping earliest event.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY workflow_id, event_type
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.workflow_events
  WHERE event_type = 'workflow.completed'
)
DELETE FROM public.workflow_events we
USING ranked r
WHERE we.id = r.id
  AND r.rn > 1;

-- 2) Enforce uniqueness at DB level for future writes/races.
CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_events_unique_completed_per_workflow
  ON public.workflow_events (workflow_id, event_type)
  WHERE event_type = 'workflow.completed';
