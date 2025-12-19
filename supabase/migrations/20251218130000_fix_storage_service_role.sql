-- Fix: Allow service_role to access storage
-- Edge Functions need to upload .eco files to user-documents bucket

-- Allow service role to INSERT (upload files)
CREATE POLICY "Service role can upload files"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'user-documents');

-- Allow service role to SELECT (read files)
CREATE POLICY "Service role can read files"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'user-documents');

-- Allow service role to UPDATE (update metadata)
CREATE POLICY "Service role can update files"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'user-documents');

-- Allow service role to DELETE (cleanup)
CREATE POLICY "Service role can delete files"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'user-documents');
