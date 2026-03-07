\set ON_ERROR_STOP on

\echo === Incident drill: projection recovery via canonical append ===

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '20s';

-- 1) Pick one linked projection row
CREATE TEMP TABLE _incident_case AS
SELECT
  ud.id AS user_document_id,
  ud.document_entity_id
FROM public.user_documents ud
WHERE ud.document_entity_id IS NOT NULL
ORDER BY COALESCE(ud.updated_at, ud.created_at) DESC NULLS LAST
LIMIT 1;

CREATE TEMP TABLE _incident_meta AS
SELECT EXISTS (SELECT 1 FROM _incident_case) AS has_case;

-- 2) Direct write must be blocked (freeze guard)
DO $$
DECLARE
  v_has_case BOOLEAN;
  v_id UUID;
BEGIN
  SELECT has_case INTO v_has_case FROM _incident_meta;
  IF NOT v_has_case THEN
    RETURN;
  END IF;

  SELECT user_document_id INTO v_id FROM _incident_case;
  BEGIN
    UPDATE public.user_documents
    SET updated_at = now()
    WHERE id = v_id;
    RAISE EXCEPTION 'Direct write unexpectedly succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('user_documents is frozen' in SQLERRM) = 0 THEN
        RAISE EXCEPTION 'Direct write failed for unexpected reason: %', SQLERRM;
      END IF;
  END;
END
$$;

-- 3) Canonical append should project to user_documents through trigger path
DO $$
DECLARE
  v_has_case BOOLEAN;
  v_entity UUID;
  v_ud UUID;
  v_before_updated TIMESTAMPTZ;
  v_before_last_event TIMESTAMPTZ;
  v_after_updated TIMESTAMPTZ;
  v_after_last_event TIMESTAMPTZ;
  v_event jsonb;
  v_now_utc text;
BEGIN
  SELECT has_case INTO v_has_case FROM _incident_meta;
  IF NOT v_has_case THEN
    RETURN;
  END IF;

  SELECT document_entity_id, user_document_id
  INTO v_entity, v_ud
  FROM _incident_case;

  SELECT updated_at, last_event_at
  INTO v_before_updated, v_before_last_event
  FROM public.user_documents
  WHERE id = v_ud;

  v_now_utc := to_char((clock_timestamp() AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_event := jsonb_build_object(
    'id', 'incident-drill-' || replace(v_now_utc, ':', ''),
    'kind', 'drill.projection.recovery',
    'at', v_now_utc,
    'v', 1,
    'actor', jsonb_build_object('type', 'system', 'id', 'incident-drill'),
    'entity_id', v_entity::text,
    'correlation_id', 'incident-drill-' || replace(v_now_utc, ':', ''),
    'meta', jsonb_build_object('source', 'incident_recovery_projection_drill')
  );

  PERFORM public.append_document_entity_event(v_entity, v_event, 'incident_recovery_projection_drill');

  SELECT updated_at, last_event_at
  INTO v_after_updated, v_after_last_event
  FROM public.user_documents
  WHERE id = v_ud;

  IF COALESCE(v_after_updated, to_timestamp(0)) <= COALESCE(v_before_updated, to_timestamp(0))
     AND COALESCE(v_after_last_event, to_timestamp(0)) <= COALESCE(v_before_last_event, to_timestamp(0)) THEN
    RAISE EXCEPTION
      'Projection path did not update user_documents (before_updated=%, after_updated=%, before_last_event=%, after_last_event=%)',
      v_before_updated, v_after_updated, v_before_last_event, v_after_last_event;
  END IF;
END
$$;

\echo === Final verdict ===
SELECT CASE
  WHEN NOT EXISTS (SELECT 1 FROM _incident_case)
    THEN '⚪ INCIDENT PROJECTION DRILL SKIPPED (no linked user_documents rows)'
  ELSE '✅ INCIDENT PROJECTION DRILL PASSED'
END AS result;

ROLLBACK;
