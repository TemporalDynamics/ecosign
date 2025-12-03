-- Tables to registrar recepción y OTP de firmantes

CREATE TABLE IF NOT EXISTS public.signer_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signer_id UUID REFERENCES public.workflow_signers(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.signature_workflows(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  signer_name TEXT,
  doc_id TEXT,
  doc_id_type TEXT,
  phone TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip TEXT,
  user_agent TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signer_receipts_workflow ON public.signer_receipts(workflow_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_signer_receipts_signer ON public.signer_receipts(signer_id);

CREATE TABLE IF NOT EXISTS public.signer_otps (
  signer_id UUID PRIMARY KEY REFERENCES public.workflow_signers(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.signature_workflows(id) ON DELETE CASCADE,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ
);

COMMENT ON TABLE public.signer_otps IS 'OTP por documento para firmantes externos';
COMMENT ON TABLE public.signer_receipts IS 'Recepción e identidad previa al OTP';

ALTER TABLE public.signer_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signer_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access receipts" ON public.signer_receipts;
CREATE POLICY "service_role full access receipts"
  ON public.signer_receipts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role full access otps" ON public.signer_otps;
CREATE POLICY "service_role full access otps"
  ON public.signer_otps
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
