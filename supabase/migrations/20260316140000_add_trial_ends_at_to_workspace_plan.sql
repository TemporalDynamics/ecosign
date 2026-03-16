-- Add explicit trial_ends_at to workspace_plan
-- Motivation: ended_at is also used for cancellations; trial needs a clear end timestamp.

ALTER TABLE public.workspace_plan
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Best-effort backfill: if some rows already use ended_at to represent trial end, copy it.
UPDATE public.workspace_plan
SET trial_ends_at = ended_at
WHERE status = 'trialing'
  AND trial_ends_at IS NULL
  AND ended_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_plan_trial_ends_at
  ON public.workspace_plan(trial_ends_at)
  WHERE status = 'trialing';

COMMENT ON COLUMN public.workspace_plan.trial_ends_at IS
  'Trial expiration timestamp when status=trialing. Separate from ended_at (cancellation).';

