-- Security Advisor Hardening (2026-03-11)
-- Purpose: close RLS gaps flagged by Supabase Advisor
-- Scope: enable RLS on exposed tables, add minimal safe policies, and
--        remove SECURITY DEFINER from diagnostic views.

BEGIN;

-- ------------------------------------------------------------------
-- 1) Re-enable RLS where policies already exist (advisor: policy_exists_rls_disabled)
-- ------------------------------------------------------------------
ALTER TABLE IF EXISTS public.signature_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workflow_signers ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------
-- 2) Enable RLS on sensitive presential verification tables
--     - sessions: owners can read/write their own
--     - otps: service-role only (no policies)
-- ------------------------------------------------------------------
ALTER TABLE IF EXISTS public.presential_verification_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.presential_verification_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS presential_sessions_owner_select ON public.presential_verification_sessions;
DROP POLICY IF EXISTS presential_sessions_owner_insert ON public.presential_verification_sessions;
DROP POLICY IF EXISTS presential_sessions_owner_update ON public.presential_verification_sessions;
DROP POLICY IF EXISTS presential_sessions_owner_delete ON public.presential_verification_sessions;

CREATE POLICY presential_sessions_owner_select
  ON public.presential_verification_sessions
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY presential_sessions_owner_insert
  ON public.presential_verification_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY presential_sessions_owner_update
  ON public.presential_verification_sessions
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY presential_sessions_owner_delete
  ON public.presential_verification_sessions
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Note: presential_verification_otps stays service-role only (no policies)

-- ------------------------------------------------------------------
-- 3) Enable RLS on workflow_artifacts (owner read)
-- ------------------------------------------------------------------
ALTER TABLE IF EXISTS public.workflow_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_artifacts_owner_read ON public.workflow_artifacts;

CREATE POLICY workflow_artifacts_owner_read
  ON public.workflow_artifacts
  FOR SELECT
  TO authenticated
  USING (
    workflow_id IN (
      SELECT id FROM public.signature_workflows WHERE owner_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------
-- 4) Workspace/Plan tables: enable RLS and allow owner reads
-- ------------------------------------------------------------------
ALTER TABLE IF EXISTS public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspace_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspace_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspace_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspace_usage_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspaces_owner_crud ON public.workspaces;
DROP POLICY IF EXISTS workspace_plan_owner_read ON public.workspace_plan;
DROP POLICY IF EXISTS workspace_limits_owner_read ON public.workspace_limits;
DROP POLICY IF EXISTS workspace_addons_owner_read ON public.workspace_addons;
DROP POLICY IF EXISTS workspace_usage_owner_read ON public.workspace_usage_snapshot;
DROP POLICY IF EXISTS plans_public_read ON public.plans;

CREATE POLICY workspaces_owner_crud
  ON public.workspaces
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY workspace_plan_owner_read
  ON public.workspace_plan
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY workspace_limits_owner_read
  ON public.workspace_limits
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY workspace_addons_owner_read
  ON public.workspace_addons
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY workspace_usage_owner_read
  ON public.workspace_usage_snapshot
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- Plans catalog can be public read (no write from clients)
CREATE POLICY plans_public_read
  ON public.plans
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ------------------------------------------------------------------
-- 5) Service-only tables: enable RLS without policies
-- ------------------------------------------------------------------
ALTER TABLE IF EXISTS public.identity_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.founder_badges ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------
-- 6) Remove SECURITY DEFINER from diagnostic views
-- ------------------------------------------------------------------
ALTER VIEW IF EXISTS public.shadow_d7_divergences SET (security_invoker = true);
ALTER VIEW IF EXISTS public.shadow_decision_divergences SET (security_invoker = true);
ALTER VIEW IF EXISTS public.ecox_summary SET (security_invoker = true);
ALTER VIEW IF EXISTS public.shadow_d5_summary SET (security_invoker = true);
ALTER VIEW IF EXISTS public.missing_polygon_anchor_events SET (security_invoker = true);
ALTER VIEW IF EXISTS public.shadow_d9_summary SET (security_invoker = true);
ALTER VIEW IF EXISTS public.shadow_d8_divergences SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_p0_workflow_truth SET (security_invoker = true);
ALTER VIEW IF EXISTS public.shadow_decision_summary SET (security_invoker = true);
ALTER VIEW IF EXISTS public.shadow_d5_divergences SET (security_invoker = true);
ALTER VIEW IF EXISTS public.shadow_decision_last_runs SET (security_invoker = true);
ALTER VIEW IF EXISTS public.shadow_d8_summary SET (security_invoker = true);
ALTER VIEW IF EXISTS public.audit_nda_consistency SET (security_invoker = true);
ALTER VIEW IF EXISTS public.shadow_d9_divergences SET (security_invoker = true);
ALTER VIEW IF EXISTS public.missing_bitcoin_anchor_events SET (security_invoker = true);
ALTER VIEW IF EXISTS public.shadow_d7_summary SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_incomplete_documents SET (security_invoker = true);

COMMIT;
