-- Harden user-owned folder/regeneration RPCs:
-- - block anon/public execution
-- - keep authenticated clients working

REVOKE ALL ON FUNCTION public.create_document_folder(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_document_folder(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_document_folder(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_document_folder(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_document_folder(text) TO postgres;

REVOKE ALL ON FUNCTION public.rename_document_folder(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rename_document_folder(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.rename_document_folder(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rename_document_folder(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rename_document_folder(uuid, text) TO postgres;

REVOKE ALL ON FUNCTION public.delete_document_folder(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_document_folder(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_document_folder(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_document_folder(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_document_folder(uuid) TO postgres;

REVOKE ALL ON FUNCTION public.move_documents_to_folder(uuid[], uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.move_documents_to_folder(uuid[], uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.move_documents_to_folder(uuid[], uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_documents_to_folder(uuid[], uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_documents_to_folder(uuid[], uuid) TO postgres;

REVOKE ALL ON FUNCTION public.request_certificate_regeneration(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_certificate_regeneration(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.request_certificate_regeneration(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_certificate_regeneration(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.request_certificate_regeneration(uuid, text) TO postgres;
