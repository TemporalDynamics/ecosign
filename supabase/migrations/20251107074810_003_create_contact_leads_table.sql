/*
  # Create Contact Leads Table

  1. New Tables
    - `contact_leads`
      - `id` (uuid, primary key)
      - `email` (text, required) - Contact email
      - `name` (text) - Optional contact name
      - `company` (text) - Optional company name
      - `message` (text) - Optional message
      - `source` (text) - Where the lead came from (landing, pricing, etc)
      - `variant` (text) - A/B test variant when captured
      - `status` (text) - Lead status (new, contacted, converted, lost)
      - `metadata` (jsonb) - Additional data
      - `created_at` (timestamptz) - Record creation time
      - `updated_at` (timestamptz) - Last update time

  2. Security
    - Enable RLS on `contact_leads` table
    - Add policy for public inserts (lead capture)
    - Add policy for authenticated admin reads/updates

  3. Indexes
    - Index on email for quick lookup
    - Index on status for filtering
    - Index on created_at for chronological queries
*/

CREATE TABLE IF NOT EXISTS contact_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  message TEXT,
  source TEXT DEFAULT 'contact_form',
  variant TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'lost')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contact_leads_email ON contact_leads(email);
CREATE INDEX IF NOT EXISTS idx_contact_leads_status ON contact_leads(status);
CREATE INDEX IF NOT EXISTS idx_contact_leads_created_at ON contact_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_leads_source ON contact_leads(source);

-- Enable RLS
ALTER TABLE contact_leads ENABLE ROW LEVEL SECURITY;

-- Allow public inserts for lead capture
CREATE POLICY "Anyone can submit contact form"
  ON contact_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users can read leads
CREATE POLICY "Authenticated users can view leads"
  ON contact_leads
  FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can update leads
CREATE POLICY "Authenticated users can update leads"
  ON contact_leads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contact_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_contact_leads_updated_at
  BEFORE UPDATE ON contact_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_leads_updated_at();
