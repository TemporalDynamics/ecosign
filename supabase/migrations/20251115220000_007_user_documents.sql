-- =====================================================
-- Migration: User Documents Storage
-- =====================================================
-- Stores user documents with their ECO certificates
-- and SignNow metadata in the cloud

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS user_documents CASCADE;

-- Create user_documents table
CREATE TABLE user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Document metadata
  document_name TEXT NOT NULL,
  document_hash TEXT NOT NULL,
  document_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',

  -- Storage paths
  pdf_storage_path TEXT NOT NULL,  -- Path in Supabase Storage
  eco_data JSONB NOT NULL,  -- ECO certificate (manifest + signatures + metadata)

  -- SignNow metadata (if signed)
  signnow_document_id TEXT,
  signnow_status TEXT,
  signed_at TIMESTAMPTZ,

  -- Timestamps and anchors
  certified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  has_legal_timestamp BOOLEAN DEFAULT false,
  has_bitcoin_anchor BOOLEAN DEFAULT false,
  bitcoin_anchor_id UUID REFERENCES anchors(id) ON DELETE SET NULL,

  -- Verification
  verification_count INTEGER DEFAULT 0,
  last_verified_at TIMESTAMPTZ,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  is_archived BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX idx_user_documents_hash ON user_documents(document_hash);
CREATE INDEX idx_user_documents_created ON user_documents(created_at DESC);
CREATE INDEX idx_user_documents_signnow ON user_documents(signnow_document_id) WHERE signnow_document_id IS NOT NULL;

-- Enable RLS
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own documents"
  ON user_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON user_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON user_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON user_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_user_documents_updated_at
  BEFORE UPDATE ON user_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create Storage bucket for user documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-documents', 'user-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Users can upload their own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Comments
COMMENT ON TABLE user_documents IS 'Stores user documents with ECO certificates and metadata';
COMMENT ON COLUMN user_documents.eco_data IS 'Complete ECO certificate (manifest + signatures + metadata) as JSONB';
COMMENT ON COLUMN user_documents.pdf_storage_path IS 'Path to signed PDF in Supabase Storage';
