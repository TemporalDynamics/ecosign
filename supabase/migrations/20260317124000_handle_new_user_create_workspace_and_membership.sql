-- Extend handle_new_user to bootstrap workspace + free plan + owner supervisor membership

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_free_plan_id uuid;
BEGIN
  -- 1) Ensure profile exists (required by FK constraints elsewhere)
  INSERT INTO public.profiles (user_id, wrap_salt)
  VALUES (
    NEW.id,
    substring(md5(gen_random_uuid()::text || NEW.id::text) from 1 for 32)
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- 2) Ensure workspace exists for owner
  SELECT id
    INTO v_workspace_id
  FROM public.workspaces
  WHERE owner_id = NEW.id
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    INSERT INTO public.workspaces (name, owner_id)
    VALUES ('Personal Workspace', NEW.id)
    RETURNING id INTO v_workspace_id;
  END IF;

  -- 3) Ensure owner supervisor membership exists
  INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
  VALUES (v_workspace_id, NEW.id, 'owner_supervisor', 'active')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- 4) Ensure a free plan assignment exists (best-effort)
  SELECT id INTO v_free_plan_id
  FROM public.plans
  WHERE key = 'free'
    AND status = 'active'
  LIMIT 1;

  IF v_free_plan_id IS NOT NULL THEN
    INSERT INTO public.workspace_plan (workspace_id, plan_id, status, started_at)
    SELECT v_workspace_id, v_free_plan_id, 'active', now()
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.workspace_plan wp
      WHERE wp.workspace_id = v_workspace_id
        AND wp.status IN ('active', 'trialing')
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user()
IS 'Automatically creates a profile, workspace, owner membership, and free plan assignment when a new user signs up';

