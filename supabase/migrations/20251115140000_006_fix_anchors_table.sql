-- ========================================
-- Fix anchors table to match edge function schema
-- ========================================

-- First, check if the old schema exists and drop it
DROP TABLE IF EXISTS anchors CASCADE;

-- Create anchors table with correct schema for OpenTimestamps
CREATE TABLE anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  document_hash TEXT NOT NULL,
  anchor_type TEXT NOT NULL DEFAULT 'opentimestamps',
  anchor_status TEXT NOT NULL DEFAULT 'queued' CHECK (anchor_status IN ('queued', 'pending', 'processing', 'confirmed', 'failed')),

  -- OpenTimestamps specific fields
  ots_proof TEXT,              -- Base64 encoded .ots proof file
  ots_calendar_url TEXT,       -- URL of the calendar server used
  bitcoin_tx_id TEXT,          -- Bitcoin transaction ID (when confirmed)
  bitcoin_block_height INTEGER, -- Block height where tx was confirmed

  -- Notification tracking
  user_email TEXT,             -- Email to notify when complete
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB,
  error_message TEXT,          -- Error details if status = 'failed'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  confirmed_at TIMESTAMPTZ,    -- When anchor was confirmed on blockchain

  -- Constraints
  CONSTRAINT valid_bitcoin_tx CHECK (
    (anchor_status = 'confirmed' AND bitcoin_tx_id IS NOT NULL) OR
    (anchor_status != 'confirmed')
  )
);

-- Comments
COMMENT ON TABLE anchors IS 'Blockchain anchoring requests and proofs (OpenTimestamps, Polygon, etc.)';
COMMENT ON COLUMN anchors.anchor_status IS 'queued: just created, pending: submitted to OTS, processing: waiting for confirmation, confirmed: anchored in blockchain, failed: error occurred';
COMMENT ON COLUMN anchors.ots_proof IS 'Base64 encoded OpenTimestamps proof file (.ots)';
COMMENT ON COLUMN anchors.user_email IS 'Email address to notify when anchoring is complete';

-- Indexes for performance
CREATE INDEX idx_anchors_document_hash ON anchors(document_hash);
CREATE INDEX idx_anchors_status ON anchors(anchor_status);
CREATE INDEX idx_anchors_created_at ON anchors(created_at DESC);
CREATE INDEX idx_anchors_user ON anchors(user_id);
CREATE INDEX idx_anchors_document ON anchors(document_id);
CREATE INDEX idx_anchors_pending ON anchors(anchor_status) WHERE anchor_status IN ('queued', 'pending', 'processing');

-- Enable RLS
ALTER TABLE anchors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own anchors"
  ON anchors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own anchors"
  ON anchors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view confirmed anchors by hash"
  ON anchors FOR SELECT
  USING (anchor_status = 'confirmed');

-- Service role can update (for background workers)
CREATE POLICY "Service role can update anchors"
  ON anchors FOR UPDATE
  USING (true);

-- Grants
GRANT SELECT, INSERT ON anchors TO authenticated;
GRANT ALL ON anchors TO service_role;

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_anchors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER anchors_updated_at
  BEFORE UPDATE ON anchors
  FOR EACH ROW
  EXECUTE FUNCTION update_anchors_updated_at();
