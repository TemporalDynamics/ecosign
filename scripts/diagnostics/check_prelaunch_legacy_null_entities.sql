\echo === Pre-launch legacy null-entity check ===

DROP TABLE IF EXISTS _prelaunch_legacy_entity_check;
CREATE TEMP TABLE _prelaunch_legacy_entity_check (
  metric text NOT NULL,
  has_document_entity_id boolean NOT NULL,
  total bigint
);

DO $$
DECLARE
  rec record;
  null_count bigint;
BEGIN
  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('invites', 'invites_without_entity'),
        ('signer_links', 'signer_links_without_entity'),
        ('document_shares', 'document_shares_without_entity')
    ) AS t(table_name, metric)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = rec.table_name
        AND c.column_name = 'document_entity_id'
    ) THEN
      EXECUTE format(
        'SELECT count(*)::bigint FROM public.%I WHERE document_entity_id IS NULL',
        rec.table_name
      )
      INTO null_count;

      INSERT INTO _prelaunch_legacy_entity_check(metric, has_document_entity_id, total)
      VALUES (rec.metric, true, null_count);
    ELSE
      INSERT INTO _prelaunch_legacy_entity_check(metric, has_document_entity_id, total)
      VALUES (rec.metric, false, NULL);
    END IF;
  END LOOP;
END $$;

SELECT metric, has_document_entity_id, total
FROM _prelaunch_legacy_entity_check
ORDER BY metric;
