-- Phase 2: custody audit tables

CREATE TABLE IF NOT EXISTS public.custody_key_rotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_entity_id UUID REFERENCES public.document_entities(id) ON DELETE CASCADE,
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_by UUID REFERENCES auth.users(id),
  previous_key_id TEXT,
  new_key_id TEXT NOT NULL,
  reason TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_custody_key_rotations_entity
  ON public.custody_key_rotations(document_entity_id, rotated_at DESC);

CREATE TABLE IF NOT EXISTS public.custody_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_entity_id UUID REFERENCES public.document_entities(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accessed_by UUID REFERENCES auth.users(id),
  access_type TEXT NOT NULL CHECK (access_type IN ('upload', 'download', 'decrypt', 'share')),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_custody_access_log_entity
  ON public.custody_access_log(document_entity_id, accessed_at DESC);

ALTER TABLE public.custody_key_rotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custody_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service_role to manage custody_key_rotations"
  ON public.custody_key_rotations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service_role to manage custody_access_log"
  ON public.custody_access_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.custody_key_rotations IS 'Audit trail for encrypted custody key rotations.';
COMMENT ON TABLE public.custody_access_log IS 'Audit log for accesses to encrypted custody storage.';
