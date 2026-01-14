-- Migration: Create append_event_to_workflow_events SQL function
-- Allows SQL functions to insert canonical events into workflow_events table.
-- Required for F0.3 (notification.skipped event) and other future SQL-driven events.

CREATE OR REPLACE FUNCTION append_event_to_workflow_events(
  p_event_type TEXT,
  p_workflow_id UUID,
  p_signer_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.workflow_events (
    event_type,
    workflow_id,
    signer_id,
    payload,
    actor_id
  ) VALUES (
    p_event_type,
    p_workflow_id,
    p_signer_id,
    p_payload,
    p_actor_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION append_event_to_workflow_events IS 'Canonical function for SQL to insert events into the workflow_events table.';
