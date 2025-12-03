-- NDA templates and events for traceability and reuse

CREATE TABLE IF NOT EXISTS public.nda_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  template_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.nda_templates IS 'Reusable NDA templates with editable sections';

CREATE INDEX IF NOT EXISTS idx_nda_templates_user ON public.nda_templates(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.nda_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.user_documents(id) ON DELETE CASCADE,
  nda_template_id UUID REFERENCES public.nda_templates(id) ON DELETE SET NULL,
  nda_hash TEXT,
  document_hash TEXT,
  action TEXT NOT NULL, -- accepted, sent, otp_verified, included_in_signature
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.nda_events IS 'Audit trail for NDA actions and acceptances';

CREATE INDEX IF NOT EXISTS idx_nda_events_document ON public.nda_events(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nda_events_template ON public.nda_events(nda_template_id, created_at DESC);

-- Updated_at trigger for templates
CREATE OR REPLACE FUNCTION public.update_nda_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nda_templates_updated_at ON public.nda_templates;
CREATE TRIGGER trg_nda_templates_updated_at
  BEFORE UPDATE ON public.nda_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nda_templates_updated_at();

-- RLS
ALTER TABLE public.nda_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nda_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their nda_templates" ON public.nda_templates;
CREATE POLICY "Users manage their nda_templates"
  ON public.nda_templates
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role writes nda_events" ON public.nda_events;
CREATE POLICY "Service role writes nda_events"
  ON public.nda_events
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users read their nda_events" ON public.nda_events;
CREATE POLICY "Users read their nda_events"
  ON public.nda_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_documents d
      WHERE d.id = nda_events.document_id AND d.user_id = auth.uid()
    )
  );
