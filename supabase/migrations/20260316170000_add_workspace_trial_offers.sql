-- Workspace trial offers: declarative commercial decisions for beta (no payment integration yet)

CREATE TABLE IF NOT EXISTS public.workspace_trial_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  plan_key TEXT NOT NULL,
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_ends_at TIMESTAMPTZ NOT NULL,
  next_plan_key TEXT NOT NULL,
  discount_percent NUMERIC(5,2),
  discount_months INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'revoked')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workspace_trial_offers_discount_percent_range
    CHECK (discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100)),
  CONSTRAINT workspace_trial_offers_discount_months_positive
    CHECK (discount_months IS NULL OR discount_months > 0)
);

COMMENT ON TABLE public.workspace_trial_offers IS
  'Commercial offer for workspace trial + optional discount. Used for emails and trial expiration transitions.';

CREATE INDEX IF NOT EXISTS idx_workspace_trial_offers_workspace_active
  ON public.workspace_trial_offers(workspace_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_workspace_trial_offers_recipient_email
  ON public.workspace_trial_offers(recipient_email);

ALTER TABLE public.workspace_trial_offers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.workspace_trial_offers FROM anon;
REVOKE ALL ON TABLE public.workspace_trial_offers FROM authenticated;

GRANT ALL ON TABLE public.workspace_trial_offers TO service_role;

