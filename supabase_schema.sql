-- Tabla de usuarios (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  company TEXT,
  plan TEXT DEFAULT 'free', -- free, basic, premium, enterprise
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de certificaciones
CREATE TABLE certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),

  -- File info
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL UNIQUE,
  file_size INTEGER,
  mime_type TEXT,

  -- Certification data
  public_key TEXT NOT NULL,
  signature TEXT NOT NULL,
  ecox_data JSONB, -- Full .ecox manifest

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  local_timestamp TIMESTAMPTZ,

  -- RFC 3161
  tsa_token TEXT,
  tsa_status TEXT DEFAULT 'success',
  tsa_verified BOOLEAN DEFAULT FALSE,

  -- OpenTimestamps
  ots_proof TEXT,
  ots_status TEXT DEFAULT 'pending', -- pending, confirmed, failed
  ots_block_height INTEGER,
  ots_confirmed_at TIMESTAMPTZ,
  estimated_ots_confirmation TIMESTAMPTZ,

  -- Polygon
  polygon_tx_hash TEXT,
  polygon_status TEXT DEFAULT 'none', -- none, pending, confirmed
  polygon_block_number INTEGER,
  polygon_confirmed_at TIMESTAMPTZ,

  -- Metadata
  nda_required BOOLEAN DEFAULT FALSE,
  shared_url TEXT UNIQUE, -- Public verification URL
  download_count INTEGER DEFAULT 0,
  verification_count INTEGER DEFAULT 0
);

-- Tabla de verificaciones (VerifyTracker)
CREATE TABLE verification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certification_id UUID REFERENCES certifications(id),

  -- Document
  document_hash TEXT NOT NULL,
  document_name TEXT,

  -- Access
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  browser_fingerprint TEXT,
  country TEXT,
  city TEXT,

  -- Interaction
  viewed_duration_seconds INTEGER,
  scroll_percentage INTEGER,
  downloaded BOOLEAN DEFAULT FALSE,
  nda_accepted BOOLEAN,
  nda_accepted_at TIMESTAMPTZ,

  -- Metadata
  referer TEXT,
  session_id TEXT
);

-- Tabla de API integrations
CREATE TABLE api_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),

  service TEXT NOT NULL, -- signnow, mifiel, etc.
  api_key_encrypted TEXT,
  status TEXT DEFAULT 'active', -- active, inactive
  last_used TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_certifications_user ON certifications(user_id);
CREATE INDEX idx_certifications_hash ON certifications(file_hash);
CREATE INDEX idx_certifications_ots_status ON certifications(ots_status, created_at);
CREATE INDEX idx_verification_logs_hash ON verification_logs(document_hash);
CREATE INDEX idx_verification_logs_accessed ON verification_logs(accessed_at DESC);

-- RLS Policies
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own certifications
CREATE POLICY "Users can view own certifications"
  ON certifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own certifications"
  ON certifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Verification logs are public (read-only for users)
CREATE POLICY "Users can view verification logs for own docs"
  ON verification_logs FOR SELECT
  USING (
    certification_id IN (
      SELECT id FROM certifications WHERE user_id = auth.uid()
    )
  );