-- Compute workspace usage for a time window (supervision/billing)

CREATE OR REPLACE FUNCTION public.compute_workspace_usage(
  p_workspace_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz
)
RETURNS TABLE (
  workspace_id uuid,
  operations_active integer,
  operations_created integer,
  documents_created integer,
  signer_invitations_sent integer
)
LANGUAGE sql
STABLE
AS $$
  WITH ops_active AS (
    SELECT COUNT(*)::int AS c
    FROM public.signature_workflows sw
    WHERE sw.workspace_id = p_workspace_id
      AND sw.status IN ('draft', 'active', 'paused')
  ),
  ops_created AS (
    SELECT COUNT(*)::int AS c
    FROM public.signature_workflows sw
    WHERE sw.workspace_id = p_workspace_id
      AND sw.created_at >= p_period_start
      AND sw.created_at < p_period_end
  ),
  docs_created AS (
    SELECT COUNT(*)::int AS c
    FROM public.document_entities de
    WHERE de.workspace_id = p_workspace_id
      AND de.created_at >= p_period_start
      AND de.created_at < p_period_end
  ),
  signer_invites AS (
    SELECT COUNT(*)::int AS c
    FROM public.workflow_signers ws
    JOIN public.signature_workflows sw ON sw.id = ws.workflow_id
    WHERE sw.workspace_id = p_workspace_id
      AND ws.created_at >= p_period_start
      AND ws.created_at < p_period_end
  )
  SELECT
    p_workspace_id AS workspace_id,
    (SELECT c FROM ops_active) AS operations_active,
    (SELECT c FROM ops_created) AS operations_created,
    (SELECT c FROM docs_created) AS documents_created,
    (SELECT c FROM signer_invites) AS signer_invitations_sent;
$$;

COMMENT ON FUNCTION public.compute_workspace_usage(uuid, timestamptz, timestamptz) IS
  'Compute usage counters for a workspace in a time window for supervision/billing.';

