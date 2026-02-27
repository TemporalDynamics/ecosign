-- P0 hardening: canonical lock for document_shares.
-- Goals:
-- 1) Remove structural dependency on user_documents FK.
-- 2) Enforce canonical ownership checks via document_entities.owner_id.
-- 3) Ensure new share rows always carry document_entity_id.
-- 4) Keep "one pending share per (entity, recipient)" uniqueness.

-- Backfill from legacy bridge where possible.
UPDATE public.document_shares ds
SET document_entity_id = d.document_entity_id
FROM public.documents d
WHERE ds.document_entity_id IS NULL
  AND ds.document_id = d.id
  AND d.document_entity_id IS NOT NULL;

UPDATE public.document_shares ds
SET status = 'accessed'
WHERE status = 'pending'
  AND accessed_at IS NOT NULL;

ALTER TABLE public.document_shares
ALTER COLUMN document_id DROP NOT NULL;

ALTER TABLE public.document_shares
DROP CONSTRAINT IF EXISTS document_shares_document_id_fkey;

-- Old uniqueness was (document_id, recipient_email, status), tied to legacy id.
ALTER TABLE public.document_shares
DROP CONSTRAINT IF EXISTS unique_pending_share;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_document_shares_pending_entity_recipient
ON public.document_shares (document_entity_id, lower(recipient_email))
WHERE status = 'pending';

-- Enforce canonical pointer for new rows (keeps old null rows until cleanup).
ALTER TABLE public.document_shares
DROP CONSTRAINT IF EXISTS document_shares_document_entity_required;

ALTER TABLE public.document_shares
ADD CONSTRAINT document_shares_document_entity_required
CHECK (document_entity_id IS NOT NULL)
NOT VALID;

-- Canonical RLS (owner by document_entities.owner_id).
DROP POLICY IF EXISTS "Users can view shares of their documents" ON public.document_shares;
DROP POLICY IF EXISTS "Users can create shares for their documents" ON public.document_shares;
DROP POLICY IF EXISTS "Service role full access" ON public.document_shares;

CREATE POLICY "Users can view shares of their documents"
ON public.document_shares
FOR SELECT
USING (
  created_by = auth.uid()
  OR document_entity_id IN (
    SELECT de.id
    FROM public.document_entities de
    WHERE de.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create shares for their documents"
ON public.document_shares
FOR INSERT
WITH CHECK (
  document_entity_id IN (
    SELECT de.id
    FROM public.document_entities de
    WHERE de.owner_id = auth.uid()
  )
);

CREATE POLICY "Service role full access"
ON public.document_shares
FOR ALL
USING (auth.role() = 'service_role');
