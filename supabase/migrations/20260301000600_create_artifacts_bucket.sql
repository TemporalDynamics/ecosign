-- Ensure artifacts bucket exists for ECO snapshots and workflow evidence files.
-- apply-signer-signature uploads ECO snapshots to:
--   artifacts/evidence/{workflow_id}/{signer_id}/{witness_hash}.eco.json

INSERT INTO storage.buckets (id, name, public)
VALUES ('artifacts', 'artifacts', false)
ON CONFLICT (id) DO NOTHING;

-- Optional explicit service-role policies for local/dev parity.
DROP POLICY IF EXISTS "Service role can upload artifacts" ON storage.objects;
CREATE POLICY "Service role can upload artifacts"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'artifacts');

DROP POLICY IF EXISTS "Service role can read artifacts" ON storage.objects;
CREATE POLICY "Service role can read artifacts"
  ON storage.objects FOR SELECT
  TO service_role
  USING (bucket_id = 'artifacts');

DROP POLICY IF EXISTS "Service role can update artifacts" ON storage.objects;
CREATE POLICY "Service role can update artifacts"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'artifacts');

DROP POLICY IF EXISTS "Service role can delete artifacts" ON storage.objects;
CREATE POLICY "Service role can delete artifacts"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'artifacts');
