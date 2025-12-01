-- Audit logs table for security/auditability
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_logs IS 'Audit trail for significant user/backend actions';
COMMENT ON COLUMN public.audit_logs.action IS 'Short action name, e.g., document_signed, anchor_requested';
COMMENT ON COLUMN public.audit_logs.metadata IS 'Additional structured data (document_id, anchor_id, etc.)';

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time ON public.audit_logs(user_id, created_at DESC);

-- Enable RLS: users can read only their logs; service_role can insert/update
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update audit logs"
  ON public.audit_logs FOR UPDATE
  USING (true);
