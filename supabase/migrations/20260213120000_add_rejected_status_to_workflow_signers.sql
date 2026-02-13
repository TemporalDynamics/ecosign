-- Add explicit signer rejection status to align DB state with canonical event signer.rejected.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workflow_signers_status_check'
      AND conrelid = 'workflow_signers'::regclass
  ) THEN
    ALTER TABLE workflow_signers
      DROP CONSTRAINT workflow_signers_status_check;
  END IF;
END $$;

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
    'rejected',
    'expired'
  ));
