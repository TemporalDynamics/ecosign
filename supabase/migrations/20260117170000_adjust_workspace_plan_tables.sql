-- Adjust workspace plan tables (polish)
-- 1) Enforce single current plan (active/trialing)
-- 2) Align workspace owner to public.profiles
-- 3) Normalize addon type/unit naming

-- 1) Replace unique constraint with partial unique index
ALTER TABLE public.workspace_plan
  DROP CONSTRAINT IF EXISTS workspace_plan_unique_active;

CREATE UNIQUE INDEX IF NOT EXISTS workspace_plan_unique_current_idx
  ON public.workspace_plan(workspace_id)
  WHERE status IN ('active', 'trialing');

-- 2) Align owner_id to public.profiles (user_id)
ALTER TABLE public.workspaces
  DROP CONSTRAINT IF EXISTS workspaces_owner_id_fkey;

ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_owner_profile_fkey
  FOREIGN KEY (owner_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 3) Normalize addon type/unit naming
ALTER TABLE public.workspace_addons
  DROP CONSTRAINT IF EXISTS workspace_addons_type_unit_check;

ALTER TABLE public.workspace_addons
  ADD CONSTRAINT workspace_addons_type_unit_check
  CHECK (
    (addon_type = 'storage_gb' AND unit = 'gb') OR
    (addon_type = 'seats' AND unit = 'seat') OR
    (addon_type = 'signature_credits' AND unit = 'signature') OR
    (addon_type = 'polygon_fast_anchor' AND unit = 'capability')
  );

COMMENT ON COLUMN public.workspace_limits.storage_gb_limit IS
  'Base storage quota from plan (GB). Add-ons are tracked in workspace_addons.';

COMMENT ON COLUMN public.workspace_limits.seats_limit IS
  'Base seat quota from plan. Add-ons are tracked in workspace_addons.';

COMMENT ON COLUMN public.workspace_limits.legal_signatures_quota IS
  'Base legal signature quota from plan. Add-ons are tracked in workspace_addons.';
