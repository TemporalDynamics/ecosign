-- Split seat limits into explicit agent vs supervisor limits

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS agent_seats_limit INTEGER,
  ADD COLUMN IF NOT EXISTS supervisor_seats_limit INTEGER;

ALTER TABLE public.workspace_limits
  ADD COLUMN IF NOT EXISTS agent_seats_limit INTEGER,
  ADD COLUMN IF NOT EXISTS supervisor_seats_limit INTEGER;

-- Backfill new columns from legacy seats_limit when present.
UPDATE public.plans
SET agent_seats_limit = COALESCE(agent_seats_limit, seats_limit)
WHERE agent_seats_limit IS NULL
  AND seats_limit IS NOT NULL;

UPDATE public.workspace_limits
SET agent_seats_limit = COALESCE(agent_seats_limit, seats_limit)
WHERE agent_seats_limit IS NULL
  AND seats_limit IS NOT NULL;

-- Default supervisor model for existing plans:
-- Free/Pro: single owner supervisor (no agents).
UPDATE public.plans
SET supervisor_seats_limit = COALESCE(supervisor_seats_limit, 1),
    agent_seats_limit = COALESCE(agent_seats_limit, 0),
    seats_limit = COALESCE(seats_limit, 0)
WHERE key IN ('free', 'pro');

-- Business: 1 supervisor + 2 agents included (agents can scale via add-on later).
UPDATE public.plans
SET supervisor_seats_limit = 1,
    agent_seats_limit = 2,
    seats_limit = 2
WHERE key = 'business';

-- Enterprise: 1 owner + 1 admin supervisor included, agents variable by contract.
UPDATE public.plans
SET supervisor_seats_limit = 2,
    agent_seats_limit = NULL,
    seats_limit = NULL
WHERE key = 'enterprise';

COMMENT ON COLUMN public.plans.agent_seats_limit IS
  'Included agent seats (operators). NULL means contract-defined/unlimited.';
COMMENT ON COLUMN public.plans.supervisor_seats_limit IS
  'Included supervisor seats (authorities). NULL means contract-defined/unlimited.';

COMMENT ON COLUMN public.workspace_limits.agent_seats_limit IS
  'Effective agent seat quota (plan + overrides). NULL means contract-defined/unlimited.';
COMMENT ON COLUMN public.workspace_limits.supervisor_seats_limit IS
  'Effective supervisor seat quota (plan + overrides). NULL means contract-defined/unlimited.';

