-- ============================================
-- Fix document_shares foreign key
-- ============================================
-- Update document_shares to reference user_documents instead of documents

-- Drop existing foreign key if it exists
ALTER TABLE document_shares
DROP CONSTRAINT IF EXISTS document_shares_document_id_fkey;

-- Add new foreign key to user_documents
ALTER TABLE document_shares
ADD CONSTRAINT document_shares_document_id_fkey
FOREIGN KEY (document_id)
REFERENCES user_documents(id)
ON DELETE CASCADE;
