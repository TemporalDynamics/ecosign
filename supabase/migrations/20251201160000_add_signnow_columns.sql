ALTER TABLE public.signature_workflows
  ADD COLUMN IF NOT EXISTS signnow_document_id TEXT,
  ADD COLUMN IF NOT EXISTS signnow_status TEXT DEFAULT 'pending';

ALTER TABLE public.workflow_signers
  ADD COLUMN IF NOT EXISTS signnow_embed_url TEXT;
