-- Bootstrap anchors table + claim_anchor_batch RPC (idempotent)
-- Purpose: Production drift fix. Some environments were missing `public.anchors`,
-- which breaks Bitcoin/Polygon anchoring workers.
--
-- Safe to run multiple times:
-- - Creates table/columns/policies/indexes if missing
-- - Replaces claim_anchor_batch implementation (deterministic SKIP LOCKED)

-- 1) anchors table
CREATE TABLE IF NOT EXISTS public.anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NULL,
  document_entity_id UUID NULL REFERENCES public.document_entities(id) ON DELETE SET NULL,
  user_id UUID NULL REFERENCES auth.users(id),
  document_hash TEXT NOT NULL,
  anchor_type TEXT NOT NULL DEFAULT 'opentimestamps',
  anchor_status TEXT NOT NULL DEFAULT 'queued' CHECK (anchor_status IN ('queued', 'pending', 'processing', 'confirmed', 'failed')),

  -- OpenTimestamps fields
  ots_proof TEXT,
  ots_calendar_url TEXT,
  bitcoin_tx_id TEXT,
  bitcoin_block_height INTEGER,

  -- Bitcoin retry bookkeeping (worker)
  bitcoin_attempts INTEGER NOT NULL DEFAULT 0,
  bitcoin_error_message TEXT,

  -- Notification tracking
  user_email TEXT,
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  notification_sent_at TIMESTAMPTZ,

  -- Metadata + errors
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,

  CONSTRAINT anchors_document_hash_anchor_type_unique UNIQUE (document_hash, anchor_type),
  CONSTRAINT valid_bitcoin_tx CHECK (
    (anchor_status = 'confirmed' AND bitcoin_tx_id IS NOT NULL)
    OR (anchor_status != 'confirmed')
  )
);

CREATE INDEX IF NOT EXISTS idx_anchors_document_hash ON public.anchors(document_hash);
CREATE INDEX IF NOT EXISTS idx_anchors_status ON public.anchors(anchor_status);
CREATE INDEX IF NOT EXISTS idx_anchors_created_at ON public.anchors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anchors_user ON public.anchors(user_id);
CREATE INDEX IF NOT EXISTS idx_anchors_document_entity_id ON public.anchors(document_entity_id) WHERE document_entity_id IS NOT NULL;

ALTER TABLE public.anchors ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated user can view own anchors, and public can view confirmed anchors.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'anchors' AND policyname = 'Users can view their own anchors'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own anchors" ON public.anchors FOR SELECT TO authenticated USING (auth.uid() = user_id)';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'anchors' AND policyname = 'Public can view confirmed anchors by hash'
  ) THEN
    EXECUTE 'CREATE POLICY "Public can view confirmed anchors by hash" ON public.anchors FOR SELECT USING (anchor_status = ''confirmed'')';
  END IF;
END$$;

-- RLS: service_role full access for edge workers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'anchors' AND policyname = 'Service role can select anchors'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can select anchors" ON public.anchors FOR SELECT TO service_role USING (true)';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'anchors' AND policyname = 'Service role can insert anchors'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can insert anchors" ON public.anchors FOR INSERT TO service_role WITH CHECK (true)';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'anchors' AND policyname = 'Service role can update anchors'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can update anchors" ON public.anchors FOR UPDATE TO service_role USING (true)';
  END IF;
END$$;

GRANT SELECT, INSERT, UPDATE ON public.anchors TO service_role;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_anchors_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'anchors_updated_at'
  ) THEN
    EXECUTE 'CREATE TRIGGER anchors_updated_at BEFORE UPDATE ON public.anchors FOR EACH ROW EXECUTE FUNCTION public.update_anchors_updated_at()';
  END IF;
END$$;

-- 2) claim_anchor_batch RPC (deterministic SKIP LOCKED)
CREATE OR REPLACE FUNCTION public.try_parse_timestamptz(p_text text)
RETURNS timestamptz
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_text IS NULL OR btrim(p_text) = '' THEN
    RETURN NULL;
  END IF;
  RETURN p_text::timestamptz;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_anchor_batch(
  p_network text,
  p_phase text DEFAULT 'pending',
  p_limit integer DEFAULT 25
)
RETURNS SETOF public.anchors
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := GREATEST(COALESCE(p_limit, 25), 1);
BEGIN
  IF p_network NOT IN ('bitcoin', 'polygon') THEN
    RAISE EXCEPTION 'Invalid network: % (expected bitcoin|polygon)', p_network;
  END IF;

  IF p_phase NOT IN ('queued', 'pending') THEN
    RAISE EXCEPTION 'Invalid phase: % (expected queued|pending)', p_phase;
  END IF;

  IF p_phase = 'queued' THEN
    IF p_network <> 'bitcoin' THEN
      RAISE EXCEPTION 'Queued phase is only valid for bitcoin anchors';
    END IF;

    RETURN QUERY
    WITH candidates AS (
      SELECT a.id
      FROM public.anchors a
      WHERE a.anchor_type = 'opentimestamps'
        AND (
          a.anchor_status = 'queued'
          OR (
            a.anchor_status = 'processing'
            AND a.ots_proof IS NULL
            AND a.updated_at < now() - interval '10 minutes'
          )
        )
      ORDER BY a.created_at ASC
      LIMIT v_limit
      FOR UPDATE SKIP LOCKED
    ), claimed AS (
      UPDATE public.anchors a
      SET anchor_status = 'processing',
          updated_at = now()
      FROM candidates c
      WHERE a.id = c.id
      RETURNING a.*
    )
    SELECT * FROM claimed;

    RETURN;
  END IF;

  IF p_network = 'bitcoin' THEN
    RETURN QUERY
    WITH candidates AS (
      SELECT a.id
      FROM public.anchors a
      WHERE a.anchor_type = 'opentimestamps'
        AND a.anchor_status IN ('pending', 'processing')
        AND a.ots_proof IS NOT NULL
        AND a.ots_calendar_url IS NOT NULL
        AND (
          public.try_parse_timestamptz(a.metadata->>'nextRetryAt') IS NULL
          OR public.try_parse_timestamptz(a.metadata->>'nextRetryAt') <= now()
        )
      ORDER BY a.bitcoin_attempts ASC, a.updated_at ASC
      LIMIT v_limit
      FOR UPDATE SKIP LOCKED
    ), claimed AS (
      UPDATE public.anchors a
      SET anchor_status = 'processing',
          updated_at = now()
      FROM candidates c
      WHERE a.id = c.id
      RETURNING a.*
    )
    SELECT * FROM claimed;

    RETURN;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT a.id
    FROM public.anchors a
    WHERE a.anchor_type = 'polygon'
      AND a.anchor_status IN ('pending', 'processing')
      AND (
        public.try_parse_timestamptz(a.metadata->>'nextRetryAt') IS NULL
        OR public.try_parse_timestamptz(a.metadata->>'nextRetryAt') <= now()
      )
    ORDER BY a.updated_at ASC
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE public.anchors a
    SET anchor_status = 'processing',
        updated_at = now()
    FROM candidates c
    WHERE a.id = c.id
    RETURNING a.*
  )
  SELECT * FROM claimed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_anchor_batch(text, text, integer) TO service_role;

