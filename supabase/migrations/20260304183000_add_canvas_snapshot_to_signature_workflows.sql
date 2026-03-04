-- Gate 3: add canvas_snapshot for EPI Canvas Virtual

ALTER TABLE public.signature_workflows
  ADD COLUMN IF NOT EXISTS canvas_snapshot jsonb;

COMMENT ON COLUMN public.signature_workflows.canvas_snapshot IS
  'Snapshot canónico de métricas de páginas y campos al configurar el workflow. Inmutable una vez set.';

-- Optional immutability: once set, cannot change
CREATE OR REPLACE FUNCTION public.prevent_canvas_snapshot_mutation()
RETURNS trigger AS $$
BEGIN
  IF NEW.canvas_snapshot IS DISTINCT FROM OLD.canvas_snapshot THEN
    IF OLD.canvas_snapshot IS NOT NULL THEN
      RAISE EXCEPTION 'canvas_snapshot is immutable once set';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_canvas_snapshot_immutable ON public.signature_workflows;
CREATE TRIGGER trigger_canvas_snapshot_immutable
  BEFORE UPDATE ON public.signature_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_canvas_snapshot_mutation();
