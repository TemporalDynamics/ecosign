-- Harden execute surface for persist_workflow_canvas_fields_atomic.
-- Single-statement DO block to avoid migration parser edge-cases in some remote environments.

DO $$
BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION public.persist_workflow_canvas_fields_atomic(uuid, uuid, jsonb, jsonb, jsonb) FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION public.persist_workflow_canvas_fields_atomic(uuid, uuid, jsonb, jsonb, jsonb) FROM anon';
  EXECUTE 'REVOKE ALL ON FUNCTION public.persist_workflow_canvas_fields_atomic(uuid, uuid, jsonb, jsonb, jsonb) FROM authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.persist_workflow_canvas_fields_atomic(uuid, uuid, jsonb, jsonb, jsonb) TO service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.persist_workflow_canvas_fields_atomic(uuid, uuid, jsonb, jsonb, jsonb) TO postgres';
  EXECUTE 'COMMENT ON FUNCTION public.persist_workflow_canvas_fields_atomic(uuid, uuid, jsonb, jsonb, jsonb) IS '
    || quote_literal('Atomic write for signature_workflows.canvas_snapshot + workflow_fields/batches to avoid partial persistence drift.');
END $$;

