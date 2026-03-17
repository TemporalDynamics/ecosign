-- Workspace Members: separate authorities (supervisors) vs operators (agents)
-- Service-role only for now; surfaces are mediated via edge functions.

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner_supervisor', 'supervisor_admin', 'agent')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workspace_members_unique_user UNIQUE (workspace_id, user_id)
);

COMMENT ON TABLE public.workspace_members IS
  'Workspace memberships with explicit operational role (authorities vs agents).';

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id
  ON public.workspace_members(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id
  ON public.workspace_members(user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_role
  ON public.workspace_members(role);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.workspace_members FROM anon;
REVOKE ALL ON TABLE public.workspace_members FROM authenticated;

GRANT ALL ON TABLE public.workspace_members TO service_role;

