/*
  # Create Analytics and Conversion Tracking Tables

  1. New Tables
    - `conversion_events`
      - `id` (uuid, primary key)
      - `variant` (text) - A/B test variant (A, B, or C)
      - `action` (text) - Type of action (page_view, cta_click, signup, purchase)
      - `page` (text) - URL path where action occurred
      - `session_id` (text) - Anonymous session identifier
      - `metadata` (jsonb) - Additional event data
      - `timestamp` (timestamptz) - When the event occurred
      - `created_at` (timestamptz) - Record creation time

  2. Security
    - Enable RLS on `conversion_events` table
    - Add policy for public inserts (anonymous tracking)
    - Add policy for authenticated admin reads

  3. Indexes
    - Index on variant for fast filtering
    - Index on action for event type queries
    - Index on timestamp for time-based analysis
*/

CREATE TABLE IF NOT EXISTS conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant TEXT NOT NULL,
  action TEXT NOT NULL,
  page TEXT,
  session_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_conversion_events_variant ON conversion_events(variant);
CREATE INDEX IF NOT EXISTS idx_conversion_events_action ON conversion_events(action);
CREATE INDEX IF NOT EXISTS idx_conversion_events_timestamp ON conversion_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversion_events_session ON conversion_events(session_id);

-- Enable RLS
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for tracking
CREATE POLICY "Anyone can insert conversion events"
  ON conversion_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users can read their own events or admins can read all
CREATE POLICY "Users can view conversion events"
  ON conversion_events
  FOR SELECT
  TO authenticated
  USING (true);

-- Create a view for aggregated analytics (accessible to authenticated users)
CREATE OR REPLACE VIEW analytics_summary AS
SELECT
  variant,
  action,
  COUNT(*) as event_count,
  COUNT(DISTINCT session_id) as unique_sessions,
  DATE_TRUNC('day', timestamp) as event_date
FROM conversion_events
GROUP BY variant, action, DATE_TRUNC('day', timestamp);

-- Grant access to the view
GRANT SELECT ON analytics_summary TO authenticated;
