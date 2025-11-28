-- ============================================
-- Migration: Fix Storage RLS Policies
-- Purpose: Add missing columns and fix workflow participants read policy
-- Date: 2025-11-27
-- ============================================

-- Step 1: Add missing columns to signature_workflows if they don't exist
ALTER TABLE public.signature_workflows
  ADD COLUMN IF NOT EXISTS document_path TEXT,
  ADD COLUMN IF NOT EXISTS document_hash TEXT,
  ADD COLUMN IF NOT EXISTS encryption_key TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS require_sequential BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflows_document_path ON signature_workflows(document_path);
CREATE INDEX IF NOT EXISTS idx_workflows_document_hash ON signature_workflows(document_hash);

-- Step 2: Drop existing policies
DROP POLICY IF EXISTS "Workflow participants can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Owners can upload documents" ON storage.objects;

-- ============================================
-- POLICY 1: Owners and Signers can upload documents
-- ============================================
-- Allow owners to upload to their own folder: {user_id}/{filename}
-- Allow signers to upload signed documents: {user_id}/{workflow_id}/{filename}
CREATE POLICY "Authenticated users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- POLICY 2: Workflow participants can read documents
-- ============================================
-- Allow read if:
-- 1. User is the owner of the workflow that references this document, OR
-- 2. User is a signer in a workflow that references this document, OR
-- 3. User can read any file in their own folder (fallback)
DROP POLICY IF EXISTS "Workflow participants can read documents" ON storage.objects;

CREATE POLICY "Workflow participants can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    -- Owner of the workflow can read the document
    EXISTS (
      SELECT 1
      FROM public.signature_workflows sw
      WHERE sw.document_path = storage.objects.name
        AND sw.owner_id = auth.uid()
    )
    OR
    -- Any signer in the workflow can read the document
    EXISTS (
      SELECT 1
      FROM public.workflow_signers ws
      JOIN public.signature_workflows sw ON sw.id = ws.workflow_id
      WHERE sw.document_path = storage.objects.name
        AND ws.email = auth.email()
    )
    OR
    -- Fallback: users can read files in their own folder
    auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- ============================================
-- NOTES:
-- ============================================
-- The key fix is in the SELECT policy:
-- Instead of checking workflow_id in path (which doesn't exist in initial upload),
-- we now check if signature_workflows.document_path matches the storage object path.
--
-- This allows:
-- - Owner to read their own documents
-- - Signers to read documents from workflows they're part of
-- - Signers to upload signed documents to their own folder
