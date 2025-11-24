-- Migración 015: Bitcoin Pending Flow + Invites System
-- Date: 2025-11-24

-- ========================================
-- 1. Extend user_documents for Bitcoin pending flow
-- ========================================

-- Add bitcoin-specific status tracking
ALTER TABLE public.user_documents
  ADD COLUMN IF NOT EXISTS bitcoin_status TEXT
    DEFAULT NULL
    CHECK (bitcoin_status IN (NULL, 'pending', 'confirmed', 'failed')),

  ADD COLUMN IF NOT EXISTS bitcoin_anchor_id UUID,

  ADD COLUMN IF NOT EXISTS bitcoin_confirmed_at TIMESTAMPTZ,

  -- Overall document status (combines signature + anchoring)
  ADD COLUMN IF NOT EXISTS overall_status TEXT
    DEFAULT 'draft'
    CHECK (overall_status IN (
      'draft',          -- Initial state
      'pending',        -- Awaiting signature or anchoring
      'pending_anchor', -- Signature done, anchoring in progress
      'certified',      -- Fully certified (all anchors confirmed)
      'rejected',
      'expired',
      'revoked'
    )),

  -- Store .eco file data for deferred download
  ADD COLUMN IF NOT EXISTS eco_file_data JSONB,

  -- Flag to control download availability
  ADD COLUMN IF NOT EXISTS download_enabled BOOLEAN DEFAULT true;

-- Update existing status mapping
UPDATE public.user_documents
SET overall_status = CASE
  WHEN status = 'signed' THEN 'certified'
  WHEN status IN ('pending', 'sent') THEN 'pending'
  WHEN status = 'draft' THEN 'draft'
  WHEN status = 'rejected' THEN 'rejected'
  WHEN status = 'expired' THEN 'expired'
  ELSE 'draft'
END
WHERE overall_status IS NULL OR overall_status = 'draft';

-- Index for bitcoin status queries
CREATE INDEX IF NOT EXISTS idx_user_documents_bitcoin_status
  ON public.user_documents(bitcoin_status)
  WHERE bitcoin_status IS NOT NULL;

-- Index for pending anchor documents
CREATE INDEX IF NOT EXISTS idx_user_documents_pending_anchor
  ON public.user_documents(overall_status)
  WHERE overall_status = 'pending_anchor';

-- ========================================
-- 2. Create invites table
-- ========================================

CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Document reference
  document_id UUID REFERENCES public.user_documents(id) ON DELETE CASCADE NOT NULL,

  -- Invitee info
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'signer')),

  -- Unique token for invitation link
  token TEXT UNIQUE NOT NULL,

  -- NDA acceptance tracking
  nda_accepted_at TIMESTAMPTZ,
  nda_ip_address TEXT,
  nda_user_agent TEXT,

  -- Invitation acceptance tracking
  accepted_at TIMESTAMPTZ,
  accessed_at TIMESTAMPTZ,

  -- Expiration and revocation
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  revocation_reason TEXT,

  -- Metadata
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Constraints
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for invites
CREATE INDEX IF NOT EXISTS idx_invites_token
  ON public.invites(token);

CREATE INDEX IF NOT EXISTS idx_invites_document_id
  ON public.invites(document_id);

CREATE INDEX IF NOT EXISTS idx_invites_email
  ON public.invites(email);

CREATE INDEX IF NOT EXISTS idx_invites_expires_at
  ON public.invites(expires_at)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invites_pending
  ON public.invites(email, accepted_at)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- ========================================
-- 3. Row Level Security for invites
-- ========================================

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Users can view invites they created
CREATE POLICY "Users can view their sent invites"
  ON public.invites
  FOR SELECT
  USING (auth.uid() = invited_by);

-- Users can create invites for their documents
CREATE POLICY "Users can create invites for their documents"
  ON public.invites
  FOR INSERT
  WITH CHECK (
    auth.uid() = invited_by
    AND EXISTS (
      SELECT 1 FROM public.user_documents
      WHERE id = document_id AND user_id = auth.uid()
    )
  );

-- Users can revoke invites they created
CREATE POLICY "Users can revoke their invites"
  ON public.invites
  FOR UPDATE
  USING (auth.uid() = invited_by)
  WITH CHECK (auth.uid() = invited_by);

-- Invitees can view their invites (by email)
CREATE POLICY "Invitees can view their invites"
  ON public.invites
  FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Invitees can update their acceptance status
CREATE POLICY "Invitees can accept invites"
  ON public.invites
  FOR UPDATE
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND revoked_at IS NULL
    AND expires_at > now()
  );

-- ========================================
-- 4. Function to generate invite tokens
-- ========================================

CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  exists_token BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 32-character token
    token := encode(gen_random_bytes(24), 'base64');
    -- Remove characters that might cause URL issues
    token := replace(replace(replace(token, '/', '_'), '+', '-'), '=', '');

    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM public.invites WHERE invites.token = token) INTO exists_token;

    -- Exit loop if token is unique
    EXIT WHEN NOT exists_token;
  END LOOP;

  RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 5. Trigger to auto-update updated_at
-- ========================================

CREATE OR REPLACE FUNCTION public.update_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invites_updated_at
  BEFORE UPDATE ON public.invites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invites_updated_at();

-- ========================================
-- 6. Comments for documentation
-- ========================================

COMMENT ON TABLE public.invites IS 'Document invitations with NDA acceptance tracking';
COMMENT ON COLUMN public.invites.token IS 'Unique token for /invite/:token URLs';
COMMENT ON COLUMN public.invites.nda_accepted_at IS 'When invitee accepted NDA (required before document access)';
COMMENT ON COLUMN public.invites.role IS 'viewer: read-only access, signer: can sign document';
COMMENT ON COLUMN public.user_documents.bitcoin_status IS 'Bitcoin anchoring status (pending/confirmed/failed)';
COMMENT ON COLUMN public.user_documents.overall_status IS 'Combined document status including signatures and anchoring';
COMMENT ON COLUMN public.user_documents.eco_file_data IS 'Stored .eco file for deferred download (when bitcoin_status = pending)';
COMMENT ON COLUMN public.user_documents.download_enabled IS 'Controls if .eco file can be downloaded (false when bitcoin pending)';
