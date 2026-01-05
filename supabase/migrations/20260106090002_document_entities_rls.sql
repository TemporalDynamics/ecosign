ALTER TABLE document_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_entities_select_own"
  ON document_entities FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "document_entities_insert_own"
  ON document_entities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "document_entities_update_own"
  ON document_entities FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
