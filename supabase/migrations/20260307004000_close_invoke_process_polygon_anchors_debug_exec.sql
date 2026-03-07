-- Close residual SECURITY DEFINER debug function execute surface if present.
-- Some environments still expose public.invoke_process_polygon_anchors_debug() to anon/authenticated.
-- This migration is idempotent and only applies revokes/grants when the function exists.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'invoke_process_polygon_anchors_debug'
      AND p.pronargs = 0
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.invoke_process_polygon_anchors_debug() FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON FUNCTION public.invoke_process_polygon_anchors_debug() FROM anon';
    EXECUTE 'REVOKE ALL ON FUNCTION public.invoke_process_polygon_anchors_debug() FROM authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.invoke_process_polygon_anchors_debug() TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.invoke_process_polygon_anchors_debug() TO postgres';
  END IF;
END $$;

