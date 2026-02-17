-- Verify canonical projection wiring

\echo '=== 1) Trigger installed ==='
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trg_project_events_to_user_document';

\echo ''
\echo '=== 2) Projection functions installed ==='
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'project_document_entity_to_user_document',
    'project_events_to_user_document_trigger',
    'rebuild_user_documents_projection'
  )
ORDER BY routine_name;

\echo ''
\echo '=== 3) Linked rows (user_documents <-> document_entities) ==='
SELECT
  count(*) FILTER (WHERE ud.document_entity_id IS NOT NULL) AS linked_rows,
  count(*) FILTER (WHERE ud.document_entity_id IS NULL) AS unlinked_rows,
  count(*) AS total_user_documents
FROM public.user_documents ud;

\echo ''
\echo '=== 4) Sample projected state from canonical events ==='
SELECT
  de.id AS document_entity_id,
  ud.id AS user_document_id,
  ud.overall_status,
  ud.has_polygon_anchor,
  ud.has_bitcoin_anchor,
  ud.download_enabled,
  ud.last_event_at
FROM public.document_entities de
JOIN public.user_documents ud ON ud.document_entity_id = de.id
WHERE jsonb_path_exists(de.events, '$[*] ? (@.kind == "anchor.confirmed")')
ORDER BY de.updated_at DESC
LIMIT 20;
