-- Compute effective workspace limits (pure function)
-- Combines plan base + active addons + enterprise/override limits

CREATE OR REPLACE FUNCTION public.compute_workspace_effective_limits(
  p_workspace_id uuid
)
RETURNS TABLE (
  workspace_id uuid,
  plan_id uuid,
  plan_key text,
  plan_capabilities jsonb,
  seats_addon integer,
  storage_addon_gb numeric,
  signature_credits_addon numeric,
  polygon_fast_anchor boolean,
  seats_limit integer,
  storage_gb_limit integer,
  legal_signatures_quota integer,
  workflows_active_limit integer,
  renotify_limit integer,
  capabilities jsonb,
  override_source text
)
LANGUAGE sql
STABLE
AS $$
WITH current_plan AS (
  SELECT wp.workspace_id,
         p.id AS plan_id,
         p.key AS plan_key,
         p.seats_limit,
         p.storage_gb_limit,
         p.legal_signatures_quota,
         p.workflows_active_limit,
         p.renotify_limit,
         p.capabilities
  FROM public.workspace_plan wp
  JOIN public.plans p ON p.id = wp.plan_id
  WHERE wp.workspace_id = p_workspace_id
    AND wp.status IN ('active', 'trialing')
  ORDER BY wp.started_at DESC
  LIMIT 1
),
addons AS (
  SELECT wa.workspace_id,
         COALESCE(SUM(CASE WHEN wa.addon_type = 'seats' AND wa.status = 'active'
           THEN wa.quantity ELSE 0 END), 0)::int AS seats_addon,
         COALESCE(SUM(CASE WHEN wa.addon_type = 'storage_gb' AND wa.status = 'active'
           THEN wa.quantity ELSE 0 END), 0) AS storage_addon_gb,
         COALESCE(SUM(CASE WHEN wa.addon_type = 'signature_credits' AND wa.status = 'active'
           THEN wa.quantity ELSE 0 END), 0) AS signature_credits_addon,
         COALESCE(BOOL_OR(wa.addon_type = 'polygon_fast_anchor' AND wa.status = 'active'), false)
           AS polygon_fast_anchor
  FROM public.workspace_addons wa
  WHERE wa.workspace_id = p_workspace_id
  GROUP BY wa.workspace_id
),
overrides AS (
  SELECT wl.workspace_id,
         wl.seats_limit,
         wl.storage_gb_limit,
         wl.legal_signatures_quota,
         wl.workflows_active_limit,
         wl.renotify_limit,
         wl.capabilities,
         wl.source
  FROM public.workspace_limits wl
  WHERE wl.workspace_id = p_workspace_id
    AND wl.source IN ('override', 'enterprise')
  LIMIT 1
)
SELECT
  p_workspace_id AS workspace_id,
  cp.plan_id,
  cp.plan_key,
  cp.capabilities AS plan_capabilities,
  COALESCE(a.seats_addon, 0) AS seats_addon,
  COALESCE(a.storage_addon_gb, 0) AS storage_addon_gb,
  COALESCE(a.signature_credits_addon, 0) AS signature_credits_addon,
  COALESCE(a.polygon_fast_anchor, false) AS polygon_fast_anchor,
  COALESCE(
    o.seats_limit,
    CASE
      WHEN cp.seats_limit IS NULL THEN NULL
      ELSE cp.seats_limit + COALESCE(a.seats_addon, 0)
    END
  ) AS seats_limit,
  COALESCE(
    o.storage_gb_limit,
    CASE
      WHEN cp.storage_gb_limit IS NULL THEN NULL
      ELSE cp.storage_gb_limit + COALESCE(a.storage_addon_gb, 0)::int
    END
  ) AS storage_gb_limit,
  COALESCE(o.legal_signatures_quota, cp.legal_signatures_quota) AS legal_signatures_quota,
  COALESCE(o.workflows_active_limit, cp.workflows_active_limit) AS workflows_active_limit,
  COALESCE(o.renotify_limit, cp.renotify_limit) AS renotify_limit,
  (
    COALESCE(cp.capabilities, '{}'::jsonb)
    || CASE
         WHEN COALESCE(a.polygon_fast_anchor, false)
           THEN '{"polygon_anchor_enabled": true, "polygon_fast_anchor": true}'::jsonb
         ELSE '{}'::jsonb
       END
    || COALESCE(o.capabilities, '{}'::jsonb)
  ) AS capabilities,
  o.source AS override_source
FROM current_plan cp
LEFT JOIN addons a ON a.workspace_id = cp.workspace_id
LEFT JOIN overrides o ON o.workspace_id = cp.workspace_id;
$$;
