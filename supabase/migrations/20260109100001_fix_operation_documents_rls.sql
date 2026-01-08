-- ========================================
-- FIX RLS for operation_documents and add added_by trigger
-- Fecha: 2026-01-09
-- ========================================

-- Drop existing INSERT policy for operation_documents
DROP POLICY IF EXISTS "Owners can insert operation_documents" ON operation_documents;

-- Create a new, less restrictive INSERT policy for operation_documents
-- Allow users to add documents to their own operations.
-- The ownership of the document_entity itself is handled by document_entities RLS.
CREATE POLICY "Users can add documents to their operations"
  ON operation_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM operations o
      WHERE o.id = operation_documents.operation_id
        AND o.owner_id = auth.uid()
    )
  );

-- Function to automatically set added_by to the authenticated user's ID
CREATE OR REPLACE FUNCTION set_operation_document_added_by()
RETURNS trigger AS $$
BEGIN
  NEW.added_by := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- SECURITY DEFINER is important for auth.uid() to work in triggers

-- Trigger to set added_by before insert on operation_documents
DROP TRIGGER IF EXISTS trg_set_operation_document_added_by ON operation_documents;
CREATE TRIGGER trg_set_operation_document_added_by
BEFORE INSERT ON operation_documents
FOR EACH ROW
EXECUTE FUNCTION set_operation_document_added_by();