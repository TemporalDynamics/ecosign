-- ============================================
-- Fix: document_shares FK to user_documents
-- ============================================
-- The FK references documents(id) but should be user_documents(id)

-- Drop FK constraint
ALTER TABLE document_shares 
DROP CONSTRAINT IF EXISTS document_shares_document_id_fkey;

-- Add correct FK
ALTER TABLE document_shares
ADD CONSTRAINT document_shares_document_id_fkey
FOREIGN KEY (document_id) 
REFERENCES user_documents(id) 
ON DELETE CASCADE;
