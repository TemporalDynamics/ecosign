-- =====================================================
-- Migration: Add Missing Columns to Documents Table
-- =====================================================
-- This migration ensures the documents table has all necessary columns
-- Safe to run multiple times (uses IF NOT EXISTS)

-- Add original_filename if missing
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS original_filename TEXT;

-- Add ecox_hash if missing (already in 001_core_schema but being defensive)
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS ecox_hash TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_eco_hash ON documents(eco_hash);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

COMMENT ON COLUMN documents.original_filename IS 'Nombre original del archivo subido';
