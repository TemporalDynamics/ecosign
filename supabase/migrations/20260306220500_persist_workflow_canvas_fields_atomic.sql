-- Atomic persistence for canvas_snapshot + workflow_fields/batches.
-- Goal: avoid partial state where canvas snapshot is stored without field persistence (or vice versa).

CREATE OR REPLACE FUNCTION public.persist_workflow_canvas_fields_atomic(
  p_workflow_id uuid,
  p_document_entity_id uuid,
  p_canvas_snapshot jsonb DEFAULT NULL,
  p_batches jsonb DEFAULT '[]'::jsonb,
  p_fields jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_batches jsonb := COALESCE(p_batches, '[]'::jsonb);
  v_fields jsonb := COALESCE(p_fields, '[]'::jsonb);
BEGIN
  IF p_workflow_id IS NULL THEN
    RAISE EXCEPTION 'p_workflow_id is required';
  END IF;

  IF p_document_entity_id IS NULL THEN
    RAISE EXCEPTION 'p_document_entity_id is required';
  END IF;

  IF jsonb_typeof(v_batches) <> 'array' THEN
    RAISE EXCEPTION 'p_batches must be a JSON array';
  END IF;

  IF jsonb_typeof(v_fields) <> 'array' THEN
    RAISE EXCEPTION 'p_fields must be a JSON array';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.signature_workflows sw
    WHERE sw.id = p_workflow_id
      AND sw.document_entity_id = p_document_entity_id
  ) THEN
    RAISE EXCEPTION 'workflow_not_found_or_document_mismatch';
  END IF;

  IF p_canvas_snapshot IS NOT NULL THEN
    UPDATE public.signature_workflows
    SET canvas_snapshot = p_canvas_snapshot
    WHERE id = p_workflow_id
      AND document_entity_id = p_document_entity_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'workflow_canvas_snapshot_update_failed';
    END IF;
  END IF;

  IF jsonb_array_length(v_batches) > 0 THEN
    INSERT INTO public.batches (id, document_entity_id, origin)
    SELECT
      NULLIF(item->>'id', '')::uuid,
      p_document_entity_id,
      COALESCE(NULLIF(item->>'origin', ''), 'user_created')
    FROM jsonb_array_elements(v_batches) AS item
    ON CONFLICT (id)
    DO UPDATE SET
      document_entity_id = EXCLUDED.document_entity_id,
      origin = EXCLUDED.origin;
  END IF;

  IF jsonb_array_length(v_fields) > 0 THEN
    INSERT INTO public.workflow_fields (
      external_field_id,
      document_entity_id,
      field_type,
      label,
      placeholder,
      position,
      assigned_to,
      assigned_signer_id,
      required,
      value,
      metadata,
      batch_id,
      apply_to_all_pages,
      created_by
    )
    SELECT
      NULLIF(item->>'external_field_id', '')::uuid,
      p_document_entity_id,
      item->>'field_type',
      NULLIF(item->>'label', ''),
      NULLIF(item->>'placeholder', ''),
      COALESCE(item->'position', '{}'::jsonb),
      NULLIF(item->>'assigned_to', ''),
      NULLIF(item->>'assigned_signer_id', '')::uuid,
      COALESCE((item->>'required')::boolean, false),
      CASE WHEN item ? 'value' THEN item->>'value' ELSE NULL END,
      CASE
        WHEN item ? 'metadata' AND jsonb_typeof(item->'metadata') = 'object'
          THEN item->'metadata'
        ELSE NULL
      END,
      NULLIF(item->>'batch_id', '')::uuid,
      COALESCE((item->>'apply_to_all_pages')::boolean, false),
      NULLIF(item->>'created_by', '')::uuid
    FROM jsonb_array_elements(v_fields) AS item
    ON CONFLICT (external_field_id)
    DO UPDATE SET
      document_entity_id = EXCLUDED.document_entity_id,
      field_type = EXCLUDED.field_type,
      label = EXCLUDED.label,
      placeholder = EXCLUDED.placeholder,
      position = EXCLUDED.position,
      assigned_to = EXCLUDED.assigned_to,
      assigned_signer_id = EXCLUDED.assigned_signer_id,
      required = EXCLUDED.required,
      value = EXCLUDED.value,
      metadata = EXCLUDED.metadata,
      batch_id = EXCLUDED.batch_id,
      apply_to_all_pages = EXCLUDED.apply_to_all_pages,
      created_by = EXCLUDED.created_by;
  END IF;

  IF p_canvas_snapshot IS NOT NULL AND jsonb_array_length(v_fields) > 0 THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.workflow_fields wf
      WHERE wf.document_entity_id = p_document_entity_id
      LIMIT 1
    ) THEN
      RAISE EXCEPTION 'atomic_invariant_failed_canvas_without_fields';
    END IF;
  END IF;
END;
$$
;
