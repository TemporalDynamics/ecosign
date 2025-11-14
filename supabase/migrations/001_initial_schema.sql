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

-- Create the anchors table for blockchain anchoring
CREATE TABLE anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES cases(id), -- Link to a specific document/case if applicable
  user_id UUID REFERENCES auth.users(id), -- Link to user who created the anchor
  document_hash TEXT NOT NULL, -- The SHA-256 hash being anchored
  anchor_type TEXT NOT NULL DEFAULT 'opentimestamps', -- e.g., 'opentimestamps', 'polygon', 'bitcoin'
  anchor_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'failed'
  raw_proof TEXT, -- Raw OpenTimestamps proof
  calendar_url TEXT, -- URL of the OpenTimestamps calendar
  bitcoin_tx_id TEXT, -- Bitcoin transaction ID (when confirmed)
  confirmed_at TIMESTAMPTZ, -- When the anchor was confirmed on blockchain
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create the integration_requests table for external service integrations
CREATE TABLE integration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL, -- 'mifiel', 'signnow', etc.
  action TEXT NOT NULL, -- 'nom-151', 'certificate', 'esignature', etc.
  document_id UUID REFERENCES cases(id), -- Link to document if applicable
  user_id UUID REFERENCES auth.users(id), -- Link to user who initiated
  document_hash TEXT, -- The hash of the document being processed
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'processing', 'completed', 'failed'
  payment_intent_id TEXT, -- Stripe payment intent ID
  external_service_id TEXT, -- ID from external service (Mifiel, SignNow, etc.)
  metadata JSONB, -- Additional data specific to the integration
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_requests ENABLE ROW LEVEL SECURITY;

-- Policies for cases table
CREATE POLICY "Owners can view their own cases" ON cases FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert their own cases" ON cases FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Policies for signatures table
CREATE POLICY "Owners can view signatures on their cases" ON signatures FOR SELECT USING (
  auth.uid() = (SELECT owner_id FROM cases WHERE id = case_id)
);

-- Policies for anchors table
CREATE POLICY "Users can view their own anchors" ON anchors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own anchors" ON anchors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public can view anchors" ON anchors FOR SELECT USING (true); -- Allow public verification

-- Policies for integration_requests table
CREATE POLICY "Users can view their own integration requests" ON integration_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own integration requests" ON integration_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_anchors_document_hash ON anchors(document_hash);
CREATE INDEX idx_anchors_status ON anchors(anchor_status);
CREATE INDEX idx_anchors_created_at ON anchors(created_at);
CREATE INDEX idx_integration_requests_service ON integration_requests(service);
CREATE INDEX idx_integration_requests_status ON integration_requests(status);
CREATE INDEX idx_integration_requests_document ON integration_requests(document_id);
CREATE INDEX idx_integration_requests_user ON integration_requests(user_id);