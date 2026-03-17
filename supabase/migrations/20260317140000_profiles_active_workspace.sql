-- Active workspace pointer per user (used to attribute usage to a workspace)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_workspace_id UUID;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_active_workspace_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_active_workspace_fkey
  FOREIGN KEY (active_workspace_id) REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_active_workspace_id
  ON public.profiles(active_workspace_id);

COMMENT ON COLUMN public.profiles.active_workspace_id IS
  'Current active workspace for the user. Used to attribute documents/workflows to a workspace for supervision and billing.';

