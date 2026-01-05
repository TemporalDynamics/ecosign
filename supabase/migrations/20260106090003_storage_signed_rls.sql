CREATE POLICY "user_documents_signed_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-documents'
    AND (storage.foldername(name))[1] = 'signed'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "user_documents_signed_select_own"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND (storage.foldername(name))[1] = 'signed'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
