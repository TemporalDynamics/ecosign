-- Document folders + zero-knowledge friendly storage fields

-- Folders table
CREATE TABLE IF NOT EXISTS public.document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.document_folders IS 'User-defined folders to organize documents';
CREATE INDEX IF NOT EXISTS idx_document_folders_user ON public.document_folders(user_id, created_at DESC);

-- Add folder reference and privacy-friendly fields to user_documents
ALTER TABLE public.user_documents
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.document_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS eco_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS ecox_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS zero_knowledge_opt_out BOOLEAN NOT NULL DEFAULT false;

-- Allow nullable PDF for zero-knowledge choice
ALTER TABLE public.user_documents
  ALTER COLUMN pdf_storage_path DROP NOT NULL;

-- Updated_at trigger for folders
CREATE OR REPLACE FUNCTION public.update_document_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_document_folders_updated_at ON public.document_folders;
CREATE TRIGGER trg_document_folders_updated_at
  BEFORE UPDATE ON public.document_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_document_folders_updated_at();

-- RLS: users manage only their folders
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their folders" ON public.document_folders;
CREATE POLICY "Users manage their folders"
  ON public.document_folders
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for folder filter on documents
CREATE INDEX IF NOT EXISTS idx_user_documents_folder ON public.user_documents(folder_id);
