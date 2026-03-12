ALTER TABLE public.signer_package_claims
  ADD COLUMN IF NOT EXISTS witness_hash text;
