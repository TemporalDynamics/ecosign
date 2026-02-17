-- Hotfix: fix COALESCE text/integer mismatch in validate_anchor_uniqueness()
-- Root cause of 42804: COALESCE(e->>'step_index', 0)

CREATE OR REPLACE FUNCTION public.validate_anchor_uniqueness()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  anchor_record RECORD;
  duplicate_count INT;
BEGIN
  FOR anchor_record IN
    SELECT
      e->'anchor'->>'network' AS network,
      e->'anchor'->>'witness_hash' AS witness_hash,
      COALESCE(e->'anchor'->>'anchor_stage', 'initial') AS anchor_stage,
      CASE
        WHEN COALESCE(e->'anchor'->>'step_index', '') ~ '^-?[0-9]+$'
          THEN (e->'anchor'->>'step_index')::int
        ELSE 0
      END AS step_index
    FROM jsonb_array_elements(COALESCE(NEW.events, '[]'::jsonb)) e
    WHERE e->>'kind' = 'anchor.confirmed'
  LOOP
    SELECT COUNT(*) INTO duplicate_count
    FROM jsonb_array_elements(COALESCE(NEW.events, '[]'::jsonb)) e2
    WHERE e2->>'kind' = 'anchor.confirmed'
      AND e2->'anchor'->>'network' = anchor_record.network
      AND COALESCE(e2->'anchor'->>'witness_hash', '') = COALESCE(anchor_record.witness_hash, '')
      AND COALESCE(e2->'anchor'->>'anchor_stage', 'initial') = anchor_record.anchor_stage
      AND (
        CASE
          WHEN COALESCE(e2->'anchor'->>'step_index', '') ~ '^-?[0-9]+$'
            THEN (e2->'anchor'->>'step_index')::int
          ELSE 0
        END
      ) = anchor_record.step_index;

    IF duplicate_count > 1 THEN
      RAISE EXCEPTION
        'Duplicate anchor.confirmed detected: witness_hash=%, network=%, stage=%, step=% (found %)',
        anchor_record.witness_hash,
        anchor_record.network,
        anchor_record.anchor_stage,
        anchor_record.step_index,
        duplicate_count;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_anchor_uniqueness() IS
  'Hotfix 2026-02-17: robust step_index parsing (int), avoids COALESCE type mismatch and preserves uniqueness checks.';
