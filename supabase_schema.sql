-- Supabase Schema for verifysign

-- Create the cases table
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  doc_storage_path TEXT,
  doc_sha256 TEXT,
  nda_text TEXT,
  link_mode TEXT DEFAULT 'public_reusable',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create the recipients table
CREATE TABLE recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  otp_required BOOLEAN DEFAULT false,
  otp_last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create the events table (forensic log)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) NOT NULL,
  recipient_id UUID REFERENCES recipients(id),
  email TEXT,
  name TEXT,
  organization TEXT,
  browser_fingerprint TEXT,
  ip_city TEXT,
  nda_sha256 TEXT,
  doc_sha256 TEXT,
  signature_svg TEXT,
  timestamp_utc TIMESTAMPTZ DEFAULT now() NOT NULL,
  anchor_txid TEXT,
  eco_path TEXT
);

-- RLS Policies

-- Policies for cases table
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view their own cases" ON cases FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert their own cases" ON cases FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Policies for recipients table
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view recipients of their cases" ON recipients FOR SELECT USING (
  auth.uid() = (SELECT owner_id FROM cases WHERE id = case_id)
);

-- Policies for events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view events of their cases" ON events FOR SELECT USING (
  auth.uid() = (SELECT owner_id FROM cases WHERE id = case_id)
);
CREATE POLICY "Recipients can view their own events" ON events FOR SELECT USING (
  auth.uid() = (SELECT user_id FROM recipients WHERE id = recipient_id) -- Assuming a user_id column on recipients
);
