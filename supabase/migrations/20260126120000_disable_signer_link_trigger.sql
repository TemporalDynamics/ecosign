-- Disable legacy signer-link trigger to avoid hash-based public links.
-- Email generation for signer links is handled in Edge Functions with real tokens.

DROP TRIGGER IF EXISTS on_signer_created ON public.workflow_signers;

COMMENT ON TABLE public.workflow_signers IS
'Public signer links MUST be generated only in Edge Functions using real tokens. Legacy triggers generating hash-based links are intentionally disabled.';
