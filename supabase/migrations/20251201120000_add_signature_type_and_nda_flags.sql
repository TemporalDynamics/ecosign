-- Añade campos para tipo de firma y estado de NDA en workflows y signers
ALTER TABLE public.signature_workflows
  ADD COLUMN IF NOT EXISTS signature_type TEXT NOT NULL DEFAULT 'ECOSIGN' CHECK (signature_type IN ('ECOSIGN', 'SIGNNOW')),
  ADD COLUMN IF NOT EXISTS signnow_embed_url TEXT;

ALTER TABLE public.workflow_signers
  ADD COLUMN IF NOT EXISTS nda_accepted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS nda_accepted_at TIMESTAMPTZ;
