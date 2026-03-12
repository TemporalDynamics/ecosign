-- Create signer package claims table (link evidence packages to user accounts)
CREATE TABLE IF NOT EXISTS public.signer_package_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signer_id uuid,
  workflow_id uuid,
  signer_email text,
  document_name text,
  pdf_path text,
  eco_path text,
  claim_token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  claimed_by uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS signer_package_claims_token_idx
  ON public.signer_package_claims (claim_token_hash);

CREATE INDEX IF NOT EXISTS signer_package_claims_claimed_by_idx
  ON public.signer_package_claims (claimed_by);

ALTER TABLE public.signer_package_claims ENABLE ROW LEVEL SECURITY;

-- Users can read their own claimed packages
CREATE POLICY "Users can view claimed signer packages"
  ON public.signer_package_claims
  FOR SELECT
  USING (claimed_by = auth.uid());

-- Service role full access
CREATE POLICY "Service role full access signer_package_claims"
  ON public.signer_package_claims
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
