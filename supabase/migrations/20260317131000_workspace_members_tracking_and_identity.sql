-- Add invitation + operational tracking fields to workspace_members

ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS member_email TEXT,
  ADD COLUMN IF NOT EXISTS member_name TEXT,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Expand status model to match supervisor UI.
ALTER TABLE public.workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_status_check;

ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_status_check
  CHECK (status IN ('active', 'invited', 'suspended', 'removed'));

-- Migrate legacy statuses.
UPDATE public.workspace_members
SET status = 'suspended'
WHERE status = 'inactive';

-- Best-effort backfill email from auth.users.
UPDATE public.workspace_members wm
SET member_email = COALESCE(wm.member_email, u.email)
FROM auth.users u
WHERE u.id = wm.user_id
  AND (wm.member_email IS NULL OR wm.member_email = '');

CREATE INDEX IF NOT EXISTS idx_workspace_members_status
  ON public.workspace_members(status);

COMMENT ON COLUMN public.workspace_members.member_email IS
  'Denormalized email for supervisor UI (avoids auth.users joins from edge).';
COMMENT ON COLUMN public.workspace_members.last_seen_at IS
  'Operational last access timestamp recorded by the dashboard (best-effort).';

