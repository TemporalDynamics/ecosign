-- Freeze direct writes to user_documents.
-- Canonical source of truth is document_entities/events; user_documents stays as legacy projection.
--
-- Allowed write contexts:
-- 1) Nested trigger execution (pg_trigger_depth() > 1), used by projection trigger paths.
-- 2) Explicit maintenance context via SET LOCAL ecosign.user_documents_write_context.
--
-- Everything else is rejected (edge direct writes, ad-hoc updates, accidental regressions).

CREATE OR REPLACE FUNCTION public.guard_user_documents_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ctx text := lower(coalesce(current_setting('ecosign.user_documents_write_context', true), ''));
  v_allowed boolean := false;
BEGIN
  v_allowed := (
    pg_trigger_depth() > 1
    OR v_ctx IN ('projection', 'legacy', 'maintenance')
  );

  IF NOT v_allowed THEN
    RAISE EXCEPTION USING
      MESSAGE = 'user_documents is frozen: direct writes are disabled',
      DETAIL = format(
        'op=%s role=%s trigger_depth=%s context=%s',
        TG_OP,
        current_user,
        pg_trigger_depth(),
        coalesce(v_ctx, '')
      ),
      HINT = 'Write canonical events into document_entities and let projection handle legacy views.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_documents_write_guard ON public.user_documents;

CREATE TRIGGER trg_user_documents_write_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.user_documents
FOR EACH ROW
EXECUTE FUNCTION public.guard_user_documents_writes();

COMMENT ON FUNCTION public.guard_user_documents_writes() IS
  'Blocks direct writes to user_documents. Allows only nested trigger/projection writes or explicit maintenance context.';
