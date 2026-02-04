-- Migration: Fix document_entities RLS policies
-- Date: 2026-02-04
-- Purpose: Ensure RLS is enabled and all CRUD policies exist for document_entities
-- 
-- This migration:
-- 1. Enables RLS if not already enabled
-- 2. Drops and recreates policies to ensure they exist
-- 3. Ensures all 4 operations (SELECT, INSERT, UPDATE, DELETE) have policies

-- Enable RLS if not already
ALTER TABLE document_entities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate cleanly
DROP POLICY IF EXISTS "document_entities_select_own" ON document_entities;
DROP POLICY IF EXISTS "document_entities_insert_own" ON document_entities;
DROP POLICY IF EXISTS "document_entities_update_own" ON document_entities;
DROP POLICY IF EXISTS "document_entities_delete_own" ON document_entities;

-- CREATE POLICY for SELECT: Users can only see their own documents
CREATE POLICY "document_entities_select_own"
  ON document_entities FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

-- CREATE POLICY for INSERT: Users can only insert documents they own
CREATE POLICY "document_entities_insert_own"
  ON document_entities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- CREATE POLICY for UPDATE: Users can only update their own documents
CREATE POLICY "document_entities_update_own"
  ON document_entities FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- CREATE POLICY for DELETE: Users can only delete their own documents
CREATE POLICY "document_entities_delete_own"
  ON document_entities FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Grant service_role ability to bypass RLS for administrative operations
-- This allows backend jobs to operate on documents regardless of owner
GRANT ALL ON document_entities TO service_role;

-- Verification comment - all 4 CRUD operations now have policies
-- SELECT: document_entities_select_own
-- INSERT: document_entities_insert_own  
-- UPDATE: document_entities_update_own
-- DELETE: document_entities_delete_own
