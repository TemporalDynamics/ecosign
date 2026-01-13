-- Canonical workflow/signer events (F0.1.5)
CREATE TABLE IF NOT EXISTS public.workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.signature_workflows(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES public.workflow_signers(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'workflow.created',
    'workflow.activated',
    'workflow.completed',
    'workflow.cancelled',
    'signer.invited',
    'signer.accessed',
    'signer.ready_to_sign',
    'signer.signed',
    'signer.cancelled',
    'document.change_requested',
    'document.change_resolved'
  )),
  payload JSONB DEFAULT '{}'::jsonb,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_events_workflow_id ON public.workflow_events(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_events_signer_id ON public.workflow_events(signer_id);
CREATE INDEX IF NOT EXISTS idx_workflow_events_event_type ON public.workflow_events(event_type);
CREATE INDEX IF NOT EXISTS idx_workflow_events_created_at ON public.workflow_events(created_at DESC);

ALTER TABLE public.workflow_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view workflow events"
  ON public.workflow_events
  FOR SELECT
  USING (
    workflow_id IN (
      SELECT id FROM public.signature_workflows
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert workflow events"
  ON public.workflow_events
  FOR INSERT
  WITH CHECK (true);
