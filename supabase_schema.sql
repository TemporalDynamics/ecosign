-- Supabase Schema for verifysign (NDA Flow)

-- Create the cases table
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  case_name TEXT NOT NULL,
  doc_name TEXT,
  doc_sha256 TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  unique_token TEXT NOT NULL UNIQUE
);

-- Create the signatures table
CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) NOT NULL,
  signer_email TEXT NOT NULL,
  signed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  signature_hash TEXT NOT NULL,
  eco_path TEXT
);

-- RLS Policies

-- Policies for cases table
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view their own cases" ON cases FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert their own cases" ON cases FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Policies for signatures table
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view signatures on their cases" ON signatures FOR SELECT USING (
  auth.uid() = (SELECT owner_id FROM cases WHERE id = case_id)
);