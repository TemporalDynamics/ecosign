-- Backfill workspace_members for existing workspaces (owner supervisor)

INSERT INTO public.workspace_members (
  workspace_id,
  user_id,
  role,
  status,
  member_email,
  last_seen_at
)
SELECT
  w.id,
  w.owner_id,
  'owner_supervisor',
  'active',
  u.email,
  now()
FROM public.workspaces w
LEFT JOIN auth.users u ON u.id = w.owner_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.workspace_members wm
  WHERE wm.workspace_id = w.id
    AND wm.user_id = w.owner_id
);

