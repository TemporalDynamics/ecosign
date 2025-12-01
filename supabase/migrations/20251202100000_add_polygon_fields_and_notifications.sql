-- Add Polygon tracking fields to anchors and allow polygon/bitcoin confirmed notifications

-- Polygon-specific columns for anchors
ALTER TABLE public.anchors
  ADD COLUMN IF NOT EXISTS polygon_tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS polygon_status TEXT DEFAULT 'pending' CHECK (polygon_status IN ('pending', 'processing', 'confirmed', 'failed')),
  ADD COLUMN IF NOT EXISTS polygon_block_number BIGINT,
  ADD COLUMN IF NOT EXISTS polygon_block_hash TEXT,
  ADD COLUMN IF NOT EXISTS polygon_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS polygon_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS polygon_error_message TEXT;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_anchors_polygon_status ON public.anchors(polygon_status);
CREATE INDEX IF NOT EXISTS idx_anchors_polygon_tx_hash ON public.anchors(polygon_tx_hash);

COMMENT ON COLUMN public.anchors.polygon_status IS 'Pending/processing/confirmed/failed state for Polygon anchors';
COMMENT ON COLUMN public.anchors.polygon_tx_hash IS 'Polygon transaction hash';
COMMENT ON COLUMN public.anchors.polygon_block_number IS 'Polygon block number where tx was included';
COMMENT ON COLUMN public.anchors.polygon_block_hash IS 'Polygon block hash where tx was included';
COMMENT ON COLUMN public.anchors.polygon_confirmed_at IS 'Timestamp when Polygon tx was confirmed';
COMMENT ON COLUMN public.anchors.polygon_attempts IS 'How many times the worker tried to confirm the Polygon tx';
COMMENT ON COLUMN public.anchors.polygon_error_message IS 'Last error while processing Polygon anchor';

-- Extend notification types to allow blockchain confirmations
ALTER TABLE public.workflow_notifications
  DROP CONSTRAINT IF EXISTS workflow_notifications_notification_type_check;

ALTER TABLE public.workflow_notifications
  ADD CONSTRAINT workflow_notifications_notification_type_check
  CHECK (notification_type IN (
    -- Workflow lifecycle
    'workflow_started',
    'your_turn_to_sign',
    'signature_completed',
    'change_requested',
    'change_accepted',
    'change_rejected',
    'new_version_ready',
    'workflow_completed',
    'workflow_cancelled',
    -- Generic/system
    'signature_request',
    'signature_reminder',
    'system',
    'other',
    -- Blockchain confirmations
    'polygon_confirmed',
    'bitcoin_confirmed'
  ));

COMMENT ON CONSTRAINT workflow_notifications_notification_type_check ON public.workflow_notifications IS
  'Allows workflow lifecycle, generic/system notifications, and blockchain confirmation events (polygon_confirmed, bitcoin_confirmed).';
