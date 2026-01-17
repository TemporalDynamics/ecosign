-- This view implements DOCUMENT_INCOMPLETE_CONTRACT.md
-- Definition is normative; this view is its executable form.

CREATE OR REPLACE VIEW public.v_incomplete_documents AS
SELECT d.id,
       d.document_entity_id,
       d.user_id,
       d.created_at
FROM public.user_documents d
WHERE
  -- 1) Inicio legal registrado
  COALESCE(d.has_legal_timestamp, false) = true

  -- 2) No hay evento terminal
  AND NOT EXISTS (
    SELECT 1
    FROM public.document_entities e,
         jsonb_array_elements(e.events) evt
    WHERE e.id = d.document_entity_id
      AND evt->>'kind' IN (
        'document.completed',
        'artifact.finalized',
        'workflow.completed',
        'document.cancelled',
        'document.failed',
        'document.archived'
      )
  );
