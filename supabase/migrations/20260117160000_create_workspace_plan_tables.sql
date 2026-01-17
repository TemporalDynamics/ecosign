-- Workspace Plan Contract (declarative state only)
-- Implements: docs/contratos/WORKSPACE_PLAN_CONTRACT.md

CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.workspaces IS
  'Workspace pooled unit: economic + operational boundary.';

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id
  ON public.workspaces(owner_id);

CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  seats_limit INTEGER,
  storage_gb_limit INTEGER,
  legal_signatures_quota INTEGER,
  workflows_active_limit INTEGER,
  renotify_limit INTEGER,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  price_reference_usd NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.plans IS
  'Declarative plan catalog. No billing logic.';

CREATE TABLE IF NOT EXISTS public.workspace_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workspace_plan_unique_active
    UNIQUE (workspace_id, status)
);

COMMENT ON TABLE public.workspace_plan IS
  'Current plan assignment per workspace (state only).';

CREATE TABLE IF NOT EXISTS public.workspace_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  seats_limit INTEGER,
  storage_gb_limit INTEGER,
  legal_signatures_quota INTEGER,
  workflows_active_limit INTEGER,
  renotify_limit INTEGER,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'plan' CHECK (source IN ('plan', 'override', 'enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.workspace_limits IS
  'Workspace limit overrides derived from plan or enterprise contract.';

CREATE TABLE IF NOT EXISTS public.workspace_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  addon_type TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.workspace_addons IS
  'Add-ons per workspace (storage, seats, signature credits).';

CREATE TABLE IF NOT EXISTS public.workspace_usage_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  seats_used INTEGER,
  storage_gb_used NUMERIC(12,2),
  legal_signatures_used INTEGER,
  workflows_active INTEGER,
  renotify_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.workspace_usage_snapshot IS
  'Optional usage snapshots for enforcement and analytics.';
