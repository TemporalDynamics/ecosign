-- Backfill workspace_plan only (data only)
-- Ensures every workspace has an active/trialing plan assignment

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.plans WHERE key = 'free') THEN
    RAISE EXCEPTION 'Missing required plan key: free';
  END IF;
END;
$$;

WITH free_plan AS (
  SELECT id
  FROM public.plans
  WHERE key = 'free'
  LIMIT 1
),
missing_plan AS (
  SELECT w.id AS workspace_id
  FROM public.workspaces w
  LEFT JOIN public.workspace_plan wp
    ON wp.workspace_id = w.id
   AND wp.status IN ('active', 'trialing')
  WHERE wp.id IS NULL
)
INSERT INTO public.workspace_plan (
  workspace_id,
  plan_id,
  status,
  started_at
)
SELECT mp.workspace_id,
       fp.id,
       'active',
       now()
FROM missing_plan mp
CROSS JOIN free_plan fp;
