-- Migration: add final_document_visibility to signature_workflows
-- Controls whether participants can access the final PDF/ECO after signing is complete.
-- 'owner_only' (default): only the owner can download the final artifact
-- 'participants': all signers who signed can also download the final artifact

ALTER TABLE signature_workflows
  ADD COLUMN IF NOT EXISTS final_document_visibility TEXT
    NOT NULL
    DEFAULT 'owner_only'
    CHECK (final_document_visibility IN ('owner_only', 'participants'));

COMMENT ON COLUMN signature_workflows.final_document_visibility IS
  'Controls whether participants can access the final PDF/ECO after signing is complete. owner_only (default) or participants.';
