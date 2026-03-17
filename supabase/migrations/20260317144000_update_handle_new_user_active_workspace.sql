-- Update handle_new_user to set profiles.active_workspace_id

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
  INSERT INTO public.profiles (user_id, wrap_salt)
  VALUES (
    NEW.id,
    substring(md5(gen_random_uuid()::text || NEW.id::text) from 1 for 32)
  )
  ON CONFLICT (user_id) DO NOTHING;

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

  UPDATE public.profiles
  SET active_workspace_id = COALESCE(active_workspace_id, v_workspace_id)
  WHERE user_id = NEW.id;

  INSERT INTO public.workspace_members (
    workspace_id,
    user_id,
    role,
    status,
    member_email,
    last_seen_at
  )
  VALUES (
    v_workspace_id,
    NEW.id,
    'owner_supervisor',
    'active',
    NEW.email,
    now()
  )
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET
    member_email = COALESCE(public.workspace_members.member_email, EXCLUDED.member_email),
    last_seen_at = COALESCE(public.workspace_members.last_seen_at, EXCLUDED.last_seen_at),
    updated_at = now();

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

