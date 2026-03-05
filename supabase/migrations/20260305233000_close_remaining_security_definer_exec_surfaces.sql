-- Close remaining SECURITY DEFINER execution surfaces that should be internal-only.
-- Folder/document RPCs are intentionally kept for authenticated users by separate grant migration.

REVOKE ALL ON FUNCTION public.generate_ecox_certificate(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_ecox_certificate(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_ecox_certificate(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_ecox_certificate(uuid) TO postgres;

REVOKE ALL ON FUNCTION public.generate_invite_token() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_invite_token() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invite_token() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_invite_token() TO postgres;

REVOKE ALL ON FUNCTION public.get_cron_runtime_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_cron_runtime_status() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_runtime_status() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_cron_runtime_status() TO postgres;

REVOKE ALL ON FUNCTION public.get_cron_status(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_cron_status(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_status(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_cron_status(text) TO postgres;

REVOKE ALL ON FUNCTION public.guard_user_documents_writes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_user_documents_writes() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_user_documents_writes() TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_user_documents_writes() TO postgres;

REVOKE ALL ON FUNCTION public.invoke_fase1_executor() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invoke_fase1_executor() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_fase1_executor() TO service_role;
GRANT EXECUTE ON FUNCTION public.invoke_fase1_executor() TO postgres;

REVOKE ALL ON FUNCTION public.invoke_process_bitcoin_anchors() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invoke_process_bitcoin_anchors() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_process_bitcoin_anchors() TO service_role;
GRANT EXECUTE ON FUNCTION public.invoke_process_bitcoin_anchors() TO postgres;

REVOKE ALL ON FUNCTION public.invoke_process_polygon_anchors() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invoke_process_polygon_anchors() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_process_polygon_anchors() TO service_role;
GRANT EXECUTE ON FUNCTION public.invoke_process_polygon_anchors() TO postgres;

REVOKE ALL ON FUNCTION public.project_events_to_user_document_trigger() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.project_events_to_user_document_trigger() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.project_events_to_user_document_trigger() TO service_role;
GRANT EXECUTE ON FUNCTION public.project_events_to_user_document_trigger() TO postgres;

REVOKE ALL ON FUNCTION public.rebuild_user_documents_projection(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rebuild_user_documents_projection(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rebuild_user_documents_projection(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.rebuild_user_documents_projection(uuid) TO postgres;

REVOKE ALL ON FUNCTION public.set_operation_document_added_by() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_operation_document_added_by() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_operation_document_added_by() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_operation_document_added_by() TO postgres;

