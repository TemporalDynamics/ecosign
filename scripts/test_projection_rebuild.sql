-- Projection rebuild test (safe, transactional)
-- Goal: prove user_documents is rebuildable from canonical events[]

BEGIN;

\echo '=== 1) Pick one linked document with anchor.confirmed ==='
CREATE TEMP TABLE _projection_case AS
SELECT
  de.id AS document_entity_id,
  ud.id AS user_document_id,
  ud.overall_status AS before_overall_status,
  ud.has_polygon_anchor AS before_has_polygon_anchor,
  ud.has_bitcoin_anchor AS before_has_bitcoin_anchor,
  ud.download_enabled AS before_download_enabled,
  ud.polygon_confirmed_at AS before_polygon_confirmed_at,
  ud.bitcoin_confirmed_at AS before_bitcoin_confirmed_at
FROM public.document_entities de
JOIN public.user_documents ud ON ud.document_entity_id = de.id
WHERE jsonb_path_exists(de.events, '$[*] ? (@.kind == "anchor.confirmed")')
ORDER BY de.updated_at DESC
LIMIT 1;

SELECT * FROM _projection_case;

\echo ''
\echo '=== 2) Corrupt projected cache fields intentionally ==='
UPDATE public.user_documents ud
SET
  overall_status = 'draft',
  has_polygon_anchor = false,
  has_bitcoin_anchor = false,
  download_enabled = false,
  polygon_confirmed_at = NULL,
  bitcoin_confirmed_at = NULL,
  updated_at = now()
WHERE ud.id = (SELECT user_document_id FROM _projection_case);

SELECT
  ud.id,
  ud.overall_status,
  ud.has_polygon_anchor,
  ud.has_bitcoin_anchor,
  ud.download_enabled
FROM public.user_documents ud
WHERE ud.id = (SELECT user_document_id FROM _projection_case);

\echo ''
\echo '=== 3) Rebuild projection for this entity ==='
SELECT public.rebuild_user_documents_projection((SELECT document_entity_id FROM _projection_case));

\echo ''
\echo '=== 4) Compare before vs after ==='
SELECT
  c.before_overall_status,
  ud.overall_status AS after_overall_status,
  (c.before_overall_status = ud.overall_status) AS overall_status_ok,
  c.before_has_polygon_anchor,
  ud.has_polygon_anchor AS after_has_polygon_anchor,
  (c.before_has_polygon_anchor = ud.has_polygon_anchor) AS polygon_ok,
  c.before_has_bitcoin_anchor,
  ud.has_bitcoin_anchor AS after_has_bitcoin_anchor,
  (c.before_has_bitcoin_anchor = ud.has_bitcoin_anchor) AS bitcoin_ok,
  c.before_download_enabled,
  ud.download_enabled AS after_download_enabled,
  (c.before_download_enabled = ud.download_enabled) AS download_ok
FROM _projection_case c
JOIN public.user_documents ud ON ud.id = c.user_document_id;

\echo ''
\echo '=== 5) Final verdict ==='
SELECT CASE
  WHEN NOT EXISTS (SELECT 1 FROM _projection_case)
    THEN '⚪ PROJECTION REBUILD TEST SKIPPED (no anchor.confirmed sample in this environment)'
  WHEN EXISTS (
    SELECT 1
    FROM _projection_case c
    JOIN public.user_documents ud ON ud.id = c.user_document_id
    WHERE c.before_overall_status = ud.overall_status
      AND c.before_has_polygon_anchor = ud.has_polygon_anchor
      AND c.before_has_bitcoin_anchor = ud.has_bitcoin_anchor
      AND c.before_download_enabled = ud.download_enabled
  )
    THEN '✅ PROJECTION REBUILD TEST PASSED'
  ELSE '❌ PROJECTION REBUILD TEST FAILED'
END AS result;

-- Keep DB untouched after test
ROLLBACK;
