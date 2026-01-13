-- Fix migration order for canonical workflow/signer states
-- Drop old constraints before updating statuses, then re-add new constraints.

-- 1) Drop old constraints (if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'signature_workflows_status_check'
  ) THEN
    ALTER TABLE signature_workflows DROP CONSTRAINT signature_workflows_status_check;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workflow_signers_status_check'
  ) THEN
    ALTER TABLE workflow_signers DROP CONSTRAINT workflow_signers_status_check;
  END IF;
END $$;

-- 2) Migrate existing workflow statuses
UPDATE signature_workflows
SET status = 'active'
WHERE status = 'paused';

-- 3) Migrate existing signer statuses
UPDATE workflow_signers
SET status = 'invited'
WHERE status = 'pending';

UPDATE workflow_signers
SET status = 'ready_to_sign'
WHERE status = 'ready';

UPDATE workflow_signers
SET status = 'verified'
WHERE status = 'requested_changes';

UPDATE workflow_signers
SET status = 'cancelled'
WHERE status = 'skipped';

-- 4) Re-add workflow status constraint
ALTER TABLE signature_workflows
  ADD CONSTRAINT signature_workflows_status_check
  CHECK (status IN (
    'draft',
    'ready',
    'active',
    'completed',
    'cancelled',
    'rejected',
    'archived'
  ));

-- 5) Re-add signer status constraint + default
ALTER TABLE workflow_signers
  ALTER COLUMN status SET DEFAULT 'invited';

ALTER TABLE workflow_signers
  ADD CONSTRAINT workflow_signers_status_check
  CHECK (status IN (
    'created',
    'invited',
    'accessed',
    'verified',
    'ready_to_sign',
    'signed',
    'cancelled',
    'expired'
  ));

-- 6) Update helper functions to use new states
CREATE OR REPLACE FUNCTION get_next_signer(p_workflow_id UUID)
RETURNS UUID AS $$
DECLARE
  v_next_signer_id UUID;
BEGIN
  SELECT id INTO v_next_signer_id
  FROM workflow_signers
  WHERE workflow_id = p_workflow_id
    AND status = 'invited'
  ORDER BY signing_order ASC
  LIMIT 1;

  RETURN v_next_signer_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION advance_workflow(p_workflow_id UUID)
RETURNS VOID AS $$
DECLARE
  v_next_signer_id UUID;
BEGIN
  v_next_signer_id := get_next_signer(p_workflow_id);

  IF v_next_signer_id IS NOT NULL THEN
    UPDATE workflow_signers
    SET status = 'ready_to_sign',
        updated_at = now()
    WHERE id = v_next_signer_id;
  ELSE
    UPDATE signature_workflows
    SET status = 'completed',
        completed_at = now(),
        updated_at = now()
    WHERE id = p_workflow_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_workflow_version(
  p_workflow_id UUID,
  p_document_url TEXT,
  p_document_hash TEXT,
  p_change_reason TEXT,
  p_requested_by UUID,
  p_modification_notes JSONB
)
RETURNS UUID AS $$
DECLARE
  v_new_version INTEGER;
  v_version_id UUID;
BEGIN
  UPDATE workflow_versions
  SET status = 'superseded'
  WHERE workflow_id = p_workflow_id
    AND status = 'active';

  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_new_version
  FROM workflow_versions
  WHERE workflow_id = p_workflow_id;

  INSERT INTO workflow_versions (
    workflow_id,
    version_number,
    document_url,
    document_hash,
    change_reason,
    requested_by,
    modification_notes,
    status
  ) VALUES (
    p_workflow_id,
    v_new_version,
    p_document_url,
    p_document_hash,
    p_change_reason,
    p_requested_by,
    p_modification_notes,
    'active'
  ) RETURNING id INTO v_version_id;

  UPDATE signature_workflows
  SET current_version = v_new_version,
      status = 'active',
      updated_at = now()
  WHERE id = p_workflow_id;

  UPDATE workflow_signers
  SET status = 'invited',
      updated_at = now()
  WHERE workflow_id = p_workflow_id
    AND status IN ('ready_to_sign', 'invited', 'accessed', 'verified');

  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;
