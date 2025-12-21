/*
  # Create Product Events Table for Analytics

  ## Purpose
  Track user interactions, feature usage, and navigation flows for product analytics.
  Separate from audit trail (events), forensic logs (access_events), and legal compliance (nda_events).

  ## Schema
  - `product_events` table for flexible product analytics
  - Supports both authenticated and anonymous sessions
  - JSONB metadata for extensibility without migrations
  - RLS policies for privacy and security

  ## Indexes
  - User + time for user behavior analysis
  - Event name + time for feature usage tracking
  - Session ID for funnel analysis

  ## Security
  - RLS enabled
  - INSERT: Allow anonymous and authenticated (controlled by frontend/backend)
  - SELECT: Users can only read their own events
*/

-- ============================================
-- Table: product_events
-- ============================================
CREATE TABLE IF NOT EXISTS public.product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identidad (puede ser null para anónimo)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,

  -- Evento
  event_name TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Contexto UX
  page_path TEXT,
  user_agent TEXT,

  -- Meta
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.product_events IS 'Product analytics events for tracking user interactions and feature usage';
COMMENT ON COLUMN public.product_events.user_id IS 'User ID (null for anonymous sessions)';
COMMENT ON COLUMN public.product_events.session_id IS 'Session identifier for funnel analysis';
COMMENT ON COLUMN public.product_events.event_name IS 'Event name (e.g., opened_legal_center, uploaded_doc)';
COMMENT ON COLUMN public.product_events.event_data IS 'Flexible JSONB metadata for event-specific data';

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_product_events_user_time
  ON public.product_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_name_time
  ON public.product_events(event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_session
  ON public.product_events(session_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

-- Policy: Allow inserts for anonymous and authenticated users
CREATE POLICY "Allow insert product events"
  ON public.product_events
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL OR auth.uid() = user_id
  );

-- Policy: Users can read their own events only
CREATE POLICY "Users can read own product events"
  ON public.product_events
  FOR SELECT
  USING (auth.uid() = user_id);
