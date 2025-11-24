-- Migration 016: Add user_document_id to anchors table
-- Date: 2025-11-24
-- Purpose: Link anchors table to user_documents for Bitcoin confirmation tracking

-- Add user_document_id column to anchors table
ALTER TABLE public.anchors
  ADD COLUMN IF NOT EXISTS user_document_id UUID REFERENCES public.user_documents(id) ON DELETE CASCADE;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_anchors_user_document
  ON public.anchors(user_document_id)
  WHERE user_document_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.anchors.user_document_id IS 'Reference to user_documents table (bidirectional with bitcoin_anchor_id)';
