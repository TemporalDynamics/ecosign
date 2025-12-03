-- Migration to create the bitcoin_ots_files table

CREATE TABLE IF NOT EXISTS public.bitcoin_ots_files (
  anchor_id UUID PRIMARY KEY REFERENCES public.anchors(id) ON DELETE CASCADE,
  ots_content BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add function to update updated_at automatically
CREATE OR REPLACE FUNCTION public.update_bitcoin_ots_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS "set_public_bitcoin_ots_files_updated_at" ON public.bitcoin_ots_files;
CREATE TRIGGER set_public_bitcoin_ots_files_updated_at
BEFORE UPDATE ON public.bitcoin_ots_files
FOR EACH ROW
EXECUTE FUNCTION public.update_bitcoin_ots_files_updated_at();

-- RLS (Row Level Security) is crucial
ALTER TABLE public.bitcoin_ots_files ENABLE ROW LEVEL SECURITY;

-- Policies (adjust as needed for your application's logic)
-- Allow owners to read their OTS files
CREATE POLICY "Allow owner to read bitcoin_ots_files" ON public.bitcoin_ots_files
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.anchors WHERE id = anchor_id AND user_id = auth.uid()));

-- Allow service_role to insert/update (function should use service_role)
CREATE POLICY "Allow service_role to manage bitcoin_ots_files" ON public.bitcoin_ots_files
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
