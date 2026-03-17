-- Backfill profiles.active_workspace_id for existing users

UPDATE public.profiles p
SET active_workspace_id = (
  SELECT w.id
  FROM public.workspaces w
  WHERE w.owner_id = p.user_id
    AND w.status = 'active'
  ORDER BY w.created_at ASC
  LIMIT 1
)
WHERE p.active_workspace_id IS NULL;

