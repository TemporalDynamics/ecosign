-- Backfill workspaces, workspace_plan, and workspace_limits (data only)
-- Assumes plans catalog is seeded and includes key = 'free'

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.plans WHERE key = 'free') THEN
    RAISE EXCEPTION 'Missing required plan key: free';
  END IF;
END;
$$;

WITH free_plan AS (
  SELECT id,
         seats_limit,
         storage_gb_limit,
         legal_signatures_quota,
         workflows_active_limit,
         renotify_limit,
         capabilities
  FROM public.plans
  WHERE key = 'free'
  LIMIT 1
),
inserted_workspaces AS (
  INSERT INTO public.workspaces (name, owner_id)
  SELECT 'Personal Workspace', p.user_id
  FROM public.profiles p
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.owner_id = p.user_id
  )
  RETURNING id
),
all_workspaces AS (
  SELECT id FROM public.workspaces
)
INSERT INTO public.workspace_plan (
  workspace_id,
  plan_id,
  status,
  started_at
)
SELECT w.id,
       fp.id,
       'active',
       now()
FROM all_workspaces w
CROSS JOIN free_plan fp
WHERE NOT EXISTS (
  SELECT 1
  FROM public.workspace_plan wp
  WHERE wp.workspace_id = w.id
    AND wp.status IN ('active', 'trialing')
);

WITH free_plan AS (
  SELECT seats_limit,
         storage_gb_limit,
         legal_signatures_quota,
         workflows_active_limit,
         renotify_limit,
         capabilities
  FROM public.plans
  WHERE key = 'free'
  LIMIT 1
),
all_workspaces AS (
  SELECT id FROM public.workspaces
)
INSERT INTO public.workspace_limits (
  workspace_id,
  seats_limit,
  storage_gb_limit,
  legal_signatures_quota,
  workflows_active_limit,
  renotify_limit,
  capabilities,
  source
)
SELECT w.id,
       fp.seats_limit,
       fp.storage_gb_limit,
       fp.legal_signatures_quota,
       fp.workflows_active_limit,
       fp.renotify_limit,
       fp.capabilities,
       'plan'
FROM all_workspaces w
CROSS JOIN free_plan fp
WHERE NOT EXISTS (
  SELECT 1
  FROM public.workspace_limits wl
  WHERE wl.workspace_id = w.id
);
