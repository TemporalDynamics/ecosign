\set ON_ERROR_STOP on

\echo === Smoke: user_documents freeze guard ===

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '20s';

-- 0) Guard trigger must exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'user_documents'
      AND t.tgname = 'trg_user_documents_write_guard'
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'Missing trigger trg_user_documents_write_guard on public.user_documents';
  END IF;
END
$$;

-- 1) Projection trigger must exist to keep legacy projection writable via canonical path
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'document_entities'
      AND t.tgname = 'trg_project_events_to_user_document'
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'Missing trigger trg_project_events_to_user_document on public.document_entities';
  END IF;
END
$$;

-- 2) Pick a projection row to test safely
CREATE TEMP TABLE _freeze_case AS
SELECT
  ud.id AS user_document_id,
  ud.document_entity_id
FROM public.user_documents ud
WHERE ud.document_entity_id IS NOT NULL
ORDER BY COALESCE(ud.updated_at, ud.created_at) DESC NULLS LAST
LIMIT 1;

CREATE TEMP TABLE _freeze_meta AS
SELECT EXISTS (SELECT 1 FROM _freeze_case) AS has_case;

DO $$
DECLARE
  v_has_case BOOLEAN;
BEGIN
  SELECT has_case INTO v_has_case FROM _freeze_meta;
  IF NOT v_has_case THEN
    RAISE NOTICE 'Skipping dynamic write checks (no user_documents rows with document_entity_id)';
  END IF;
END
$$;

-- 3) Direct write must fail with guard error
DO $$
DECLARE
  v_has_case BOOLEAN;
  v_id UUID;
BEGIN
  SELECT has_case INTO v_has_case FROM _freeze_meta;
  IF NOT v_has_case THEN
    RETURN;
  END IF;

  SELECT user_document_id INTO v_id FROM _freeze_case;
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

-- 4) Explicit maintenance context must allow direct write
DO $$
DECLARE
  v_has_case BOOLEAN;
  v_id UUID;
  v_rows INTEGER;
BEGIN
  SELECT has_case INTO v_has_case FROM _freeze_meta;
  IF NOT v_has_case THEN
    RETURN;
  END IF;

  SELECT user_document_id INTO v_id FROM _freeze_case;
  PERFORM set_config('ecosign.user_documents_write_context', 'maintenance', true);

  UPDATE public.user_documents
  SET updated_at = now()
  WHERE id = v_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows != 1 THEN
    RAISE EXCEPTION 'Maintenance context write did not affect exactly one row (rows=%)', v_rows;
  END IF;
END
$$;

-- 5) Projection path (trigger depth) must still update user_documents
DO $$
DECLARE
  v_has_case BOOLEAN;
  v_entity UUID;
  v_ud UUID;
  v_before_updated TIMESTAMPTZ;
  v_before_last_event TIMESTAMPTZ;
  v_after_updated TIMESTAMPTZ;
  v_after_last_event TIMESTAMPTZ;
BEGIN
  SELECT has_case INTO v_has_case FROM _freeze_meta;
  IF NOT v_has_case THEN
    RETURN;
  END IF;

  SELECT document_entity_id, user_document_id
  INTO v_entity, v_ud
  FROM _freeze_case;

  SELECT updated_at, last_event_at
  INTO v_before_updated, v_before_last_event
  FROM public.user_documents
  WHERE id = v_ud;

  UPDATE public.document_entities
  SET events = COALESCE(events, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'kind', 'freeze.smoke',
      'at', to_char((clock_timestamp() AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
  )
  WHERE id = v_entity;

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

ROLLBACK;

\echo PASS: user_documents freeze smoke checks passed (transaction rolled back)
