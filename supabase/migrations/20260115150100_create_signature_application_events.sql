-- P2.2 — Create signature_application_events table
-- Purpose: Track logical application of signature to each field
-- Author: EcoSign Dev Team
-- Date: 2026-01-15

-- Table: signature_application_events
-- Logical events: "signature X applies to field Y"
-- Does NOT create new PDF or change hash
CREATE TABLE IF NOT EXISTS public.signature_application_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  workflow_id UUID NOT NULL REFERENCES public.signature_workflows(id) ON DELETE CASCADE,
  signature_instance_id UUID NOT NULL REFERENCES public.signature_instances(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.workflow_fields(id) ON DELETE CASCADE,
  
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Invariant: one signature per field
  UNIQUE (signature_instance_id, field_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sig_app_events_workflow 
  ON public.signature_application_events(workflow_id);

CREATE INDEX IF NOT EXISTS idx_sig_app_events_instance 
  ON public.signature_application_events(signature_instance_id);

CREATE INDEX IF NOT EXISTS idx_sig_app_events_field 
  ON public.signature_application_events(field_id);

-- RLS policies
ALTER TABLE public.signature_application_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read application events
CREATE POLICY sig_app_events_read
  ON public.signature_application_events
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert (validated by application logic)
CREATE POLICY sig_app_events_insert
  ON public.signature_application_events
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
