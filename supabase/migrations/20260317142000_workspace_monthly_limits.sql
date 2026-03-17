-- Monthly limits for supervision/billing (counts)

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS operations_monthly_limit INTEGER,
  ADD COLUMN IF NOT EXISTS invitations_monthly_limit INTEGER;

ALTER TABLE public.workspace_limits
  ADD COLUMN IF NOT EXISTS operations_monthly_limit INTEGER,
  ADD COLUMN IF NOT EXISTS invitations_monthly_limit INTEGER;

-- Defaults (can be refined later)
UPDATE public.plans
SET operations_monthly_limit = COALESCE(operations_monthly_limit, 25),
    invitations_monthly_limit = COALESCE(invitations_monthly_limit, 50)
WHERE key IN ('free', 'pro');

UPDATE public.plans
SET operations_monthly_limit = 100,
    invitations_monthly_limit = 200
WHERE key = 'business';

-- Enterprise is contract-defined by default
UPDATE public.plans
SET operations_monthly_limit = NULL,
    invitations_monthly_limit = NULL
WHERE key = 'enterprise';

COMMENT ON COLUMN public.plans.operations_monthly_limit IS
  'Monthly operations/workflows created quota. NULL means contract-defined/unlimited.';
COMMENT ON COLUMN public.plans.invitations_monthly_limit IS
  'Monthly signer invitations quota. NULL means contract-defined/unlimited.';

