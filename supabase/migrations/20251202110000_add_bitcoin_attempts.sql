-- Add bookkeeping fields for Bitcoin anchoring attempts/errors
ALTER TABLE public.anchors
  ADD COLUMN IF NOT EXISTS bitcoin_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bitcoin_error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_anchors_bitcoin_attempts ON public.anchors(bitcoin_attempts);
