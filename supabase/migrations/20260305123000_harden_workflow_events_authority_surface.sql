-- Harden workflow_events authority boundary.
-- workflow_events is now an authority-adjacent ledger because
-- signature_workflows.status is projected from these events.

-- 1) Close RPC writer to service-only.
REVOKE ALL ON FUNCTION public.append_event_to_workflow_events(text, uuid, uuid, jsonb, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.append_event_to_workflow_events(text, uuid, uuid, jsonb, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.append_event_to_workflow_events(text, uuid, uuid, jsonb, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.append_event_to_workflow_events(text, uuid, uuid, jsonb, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.append_event_to_workflow_events(text, uuid, uuid, jsonb, uuid) TO postgres;

-- 2) Restrict INSERT policy to service role only.
DROP POLICY IF EXISTS "Service role can insert workflow events" ON public.workflow_events;
CREATE POLICY "Service role can insert workflow events"
  ON public.workflow_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 3) Remove direct DML surface for anon/authenticated.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.workflow_events FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.workflow_events FROM authenticated;

-- 4) Claim functions are internal runtime functions; close external execution.
REVOKE ALL ON FUNCTION public.claim_execution_jobs(integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_execution_jobs(integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.claim_execution_jobs(integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_execution_jobs(integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_execution_jobs(integer, text) TO postgres;

REVOKE ALL ON FUNCTION public.claim_executor_jobs(integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_executor_jobs(integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.claim_executor_jobs(integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_executor_jobs(integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_executor_jobs(integer, text) TO postgres;
