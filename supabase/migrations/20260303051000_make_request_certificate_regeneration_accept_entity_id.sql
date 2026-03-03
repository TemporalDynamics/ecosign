-- Accept both user_documents.id and document_entities.id in regeneration requests.
CREATE OR REPLACE FUNCTION public.request_certificate_regeneration(_document_id UUID, _request_type TEXT)
RETURNS public.certificate_regeneration_requests AS $$
DECLARE
  v_user UUID;
  v_row public.certificate_regeneration_requests;
  v_user_document_id UUID;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null';
  END IF;

  IF _request_type NOT IN ('eco','ecox','pdf') THEN
    RAISE EXCEPTION 'Invalid request_type';
  END IF;

  SELECT d.id
  INTO v_user_document_id
  FROM public.user_documents d
  WHERE d.user_id = v_user
    AND (d.id = _document_id OR d.document_entity_id = _document_id)
  ORDER BY CASE WHEN d.id = _document_id THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_user_document_id IS NULL THEN
    RAISE EXCEPTION 'Document not found or not owned by user';
  END IF;

  INSERT INTO public.certificate_regeneration_requests(user_id, document_id, request_type)
  VALUES (v_user, v_user_document_id, _request_type)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
