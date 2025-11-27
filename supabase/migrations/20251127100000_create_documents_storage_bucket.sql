-- ============================================
-- Migration: Create Documents Storage Bucket
-- Purpose: Storage bucket for PDFs with RLS policies
-- Date: 2025-11-27
-- ============================================

-- Create the documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,  -- Private bucket
  52428800,  -- 50MB max file size
  ARRAY['application/pdf']  -- Only PDFs allowed
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Policy 1: Owners can upload documents
-- Format: {user_id}/{workflow_id}/{filename}.pdf
CREATE POLICY "Owners can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Workflow participants can read documents
-- Allow read if user is owner OR is a signer in the workflow
CREATE POLICY "Workflow participants can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    -- User is the owner (folder name matches user ID)
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- User is a signer in the workflow
    EXISTS (
      SELECT 1
      FROM public.workflow_signers ws
      JOIN public.signature_workflows sw ON ws.workflow_id = sw.id
      WHERE ws.email = auth.email()
        AND sw.id::text = (storage.foldername(name))[2]
    )
  )
);

-- Policy 3: Owners can update their documents (re-upload)
CREATE POLICY "Owners can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Owners can delete their documents
CREATE POLICY "Owners can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- NOTES:
-- ============================================
-- "Owners can upload documents": Allows authenticated users to upload PDFs to their own folder (user_id)
-- "Workflow participants can read documents": Allows owners and signers to read documents they have access to
-- "Owners can update documents": Allows owners to re-upload or update their documents
-- "Owners can delete documents": Allows owners to delete their own documents
