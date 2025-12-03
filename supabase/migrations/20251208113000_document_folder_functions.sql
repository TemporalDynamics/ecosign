-- RPC helpers for folders and certificate regeneration stubs

-- Create folder
CREATE OR REPLACE FUNCTION public.create_document_folder(_name TEXT)
RETURNS public.document_folders AS $$
DECLARE
  v_user UUID;
  v_row public.document_folders;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null';
  END IF;

  INSERT INTO public.document_folders(user_id, name)
  VALUES (v_user, _name)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Rename folder
CREATE OR REPLACE FUNCTION public.rename_document_folder(_folder_id UUID, _name TEXT)
RETURNS public.document_folders AS $$
DECLARE
  v_user UUID;
  v_row public.document_folders;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null';
  END IF;

  UPDATE public.document_folders
  SET name = _name, updated_at = now()
  WHERE id = _folder_id AND user_id = v_user
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Folder not found or not owned by user';
  END IF;

  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Delete folder (documents remain; FK ON DELETE SET NULL)
CREATE OR REPLACE FUNCTION public.delete_document_folder(_folder_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user UUID;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null';
  END IF;

  DELETE FROM public.document_folders
  WHERE id = _folder_id AND user_id = v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Folder not found or not owned by user';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Move multiple documents to folder (or null)
CREATE OR REPLACE FUNCTION public.move_documents_to_folder(_doc_ids UUID[], _folder_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  v_user UUID;
  v_count INTEGER;
  v_folder_owner UUID;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null';
  END IF;

  IF _folder_id IS NOT NULL THEN
    SELECT user_id INTO v_folder_owner FROM public.document_folders WHERE id = _folder_id;
    IF v_folder_owner IS NULL OR v_folder_owner != v_user THEN
      RAISE EXCEPTION 'Folder not found or not owned by user';
    END IF;
  END IF;

  -- Ensure all docs belong to user
  IF EXISTS (
    SELECT 1 FROM public.user_documents d
    WHERE d.id = ANY(_doc_ids) AND d.user_id <> v_user
  ) THEN
    RAISE EXCEPTION 'One or more documents do not belong to user';
  END IF;

  UPDATE public.user_documents
  SET folder_id = _folder_id, updated_at = now()
  WHERE id = ANY(_doc_ids) AND user_id = v_user
  RETURNING 1 INTO v_count;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Regeneration requests stub
CREATE TABLE IF NOT EXISTS public.certificate_regeneration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.user_documents(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('eco','ecox','pdf')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_certificate_regen_user ON public.certificate_regeneration_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificate_regen_doc ON public.certificate_regeneration_requests(document_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_certificate_regen_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_certificate_regen_updated_at ON public.certificate_regeneration_requests;
CREATE TRIGGER trg_certificate_regen_updated_at
  BEFORE UPDATE ON public.certificate_regeneration_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_certificate_regen_updated_at();

-- RPC to enqueue regeneration
CREATE OR REPLACE FUNCTION public.request_certificate_regeneration(_document_id UUID, _request_type TEXT)
RETURNS public.certificate_regeneration_requests AS $$
DECLARE
  v_user UUID;
  v_row public.certificate_regeneration_requests;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null';
  END IF;

  IF _request_type NOT IN ('eco','ecox','pdf') THEN
    RAISE EXCEPTION 'Invalid request_type';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_documents d WHERE d.id = _document_id AND d.user_id = v_user) THEN
    RAISE EXCEPTION 'Document not found or not owned by user';
  END IF;

  INSERT INTO public.certificate_regeneration_requests(user_id, document_id, request_type)
  VALUES (v_user, _document_id, _request_type)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RLS
ALTER TABLE public.certificate_regeneration_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their regen requests" ON public.certificate_regeneration_requests;
CREATE POLICY "Users read their regen requests"
  ON public.certificate_regeneration_requests
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert their regen requests" ON public.certificate_regeneration_requests;
CREATE POLICY "Users insert their regen requests"
  ON public.certificate_regeneration_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role updates regen requests" ON public.certificate_regeneration_requests;
CREATE POLICY "Service role updates regen requests"
  ON public.certificate_regeneration_requests
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
