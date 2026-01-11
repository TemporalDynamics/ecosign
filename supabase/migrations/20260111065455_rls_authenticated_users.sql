-- RLS Policies for Authenticated Users
-- Users can access their own documents and anchors

-- USER_DOCUMENTS
DROP POLICY IF EXISTS "Users can view their own documents" ON user_documents;
CREATE POLICY "Users can view their own documents" ON user_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own documents" ON user_documents;
CREATE POLICY "Users can insert their own documents" ON user_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ANCHORS
DROP POLICY IF EXISTS "Users can view their own anchors" ON anchors;
CREATE POLICY "Users can view their own anchors" ON anchors FOR SELECT TO authenticated USING (auth.uid() = user_id);
