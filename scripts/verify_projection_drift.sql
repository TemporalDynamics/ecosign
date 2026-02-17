-- Drift check: canonical events[] vs projected user_documents
-- Produces mismatches only.

WITH canonical AS (
  SELECT
    de.id AS document_entity_id,
    COALESCE(bool_or((e->'anchor'->>'network') = 'polygon') FILTER (WHERE e->>'kind' = 'anchor.confirmed'), false) AS expected_has_polygon,
    COALESCE(bool_or((e->'anchor'->>'network') = 'bitcoin') FILTER (WHERE e->>'kind' = 'anchor.confirmed'), false) AS expected_has_bitcoin
  FROM public.document_entities de
  LEFT JOIN LATERAL jsonb_array_elements(de.events) e ON true
  GROUP BY de.id
),
joined AS (
  SELECT
    ud.id AS user_document_id,
    ud.document_entity_id,
    c.expected_has_polygon,
    c.expected_has_bitcoin,
    ud.has_polygon_anchor AS projected_has_polygon,
    ud.has_bitcoin_anchor AS projected_has_bitcoin,
    ud.overall_status,
    ud.download_enabled
  FROM public.user_documents ud
  JOIN canonical c ON c.document_entity_id = ud.document_entity_id
)
SELECT *
FROM joined
WHERE expected_has_polygon IS DISTINCT FROM projected_has_polygon
   OR expected_has_bitcoin IS DISTINCT FROM projected_has_bitcoin
   OR (
      (expected_has_polygon OR expected_has_bitcoin)
      AND (overall_status <> 'certified' OR download_enabled <> true)
   )
   OR (
      NOT (expected_has_polygon OR expected_has_bitcoin)
      AND (overall_status = 'certified' OR download_enabled = true)
   )
ORDER BY user_document_id;
