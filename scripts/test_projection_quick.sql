-- Quick projection sanity check
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
LIMIT 10;
