-- Attribute operational entities to a workspace_id (truth for supervision/billing)

ALTER TABLE public.document_entities
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

ALTER TABLE public.signature_workflows
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

ALTER TABLE public.document_entities
  DROP CONSTRAINT IF EXISTS document_entities_workspace_fkey;
ALTER TABLE public.document_entities
  ADD CONSTRAINT document_entities_workspace_fkey
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE RESTRICT;

ALTER TABLE public.signature_workflows
  DROP CONSTRAINT IF EXISTS signature_workflows_workspace_fkey;
ALTER TABLE public.signature_workflows
  ADD CONSTRAINT signature_workflows_workspace_fkey
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_document_entities_workspace_created_at
  ON public.document_entities(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_signature_workflows_workspace_created_at
  ON public.signature_workflows(workspace_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.resolve_active_workspace_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT active_workspace_id FROM public.profiles WHERE user_id = p_user_id LIMIT 1),
    (SELECT id FROM public.workspaces WHERE owner_id = p_user_id AND status = 'active' ORDER BY created_at ASC LIMIT 1)
  );
$$;

COMMENT ON FUNCTION public.resolve_active_workspace_id(uuid) IS
  'Resolve the workspace_id to attribute usage for a user (profiles.active_workspace_id fallback to owner workspace).';

CREATE OR REPLACE FUNCTION public.assign_workspace_id_from_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ws uuid;
BEGIN
  IF NEW.workspace_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_ws := public.resolve_active_workspace_id(NEW.owner_id);
  IF v_ws IS NOT NULL THEN
    NEW.workspace_id := v_ws;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS document_entities_assign_workspace_id ON public.document_entities;
CREATE TRIGGER document_entities_assign_workspace_id
  BEFORE INSERT ON public.document_entities
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_workspace_id_from_owner();

DROP TRIGGER IF EXISTS signature_workflows_assign_workspace_id ON public.signature_workflows;
CREATE TRIGGER signature_workflows_assign_workspace_id
  BEFORE INSERT ON public.signature_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_workspace_id_from_owner();

-- Backfill existing records best-effort.
UPDATE public.document_entities de
SET workspace_id = public.resolve_active_workspace_id(de.owner_id)
WHERE de.workspace_id IS NULL;

UPDATE public.signature_workflows sw
SET workspace_id = public.resolve_active_workspace_id(sw.owner_id)
WHERE sw.workspace_id IS NULL;

