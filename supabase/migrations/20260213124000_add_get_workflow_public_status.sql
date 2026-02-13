-- Public status resolver for UI/API consumers.
-- Single canonical status source for workflow visibility.
CREATE OR REPLACE FUNCTION public.get_workflow_public_status(p_workflow_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN sw.status IN ('draft', 'ready', 'active', 'completed', 'cancelled', 'rejected', 'archived')
      THEN sw.status
    ELSE NULL
  END
  FROM public.signature_workflows sw
  WHERE sw.id = p_workflow_id
  LIMIT 1
$$;

COMMENT ON FUNCTION public.get_workflow_public_status(UUID)
IS 'Returns canonical public workflow status (draft|ready|active|completed|cancelled|rejected|archived) for a workflow id.';
