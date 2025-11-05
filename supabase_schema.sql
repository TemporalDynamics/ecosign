-- supabase_schema.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  owner_email text,
  title text,
  type text, -- 'template'|'upload'
  version int DEFAULT 1,
  sha256 text,
  storage_url text
);

CREATE TABLE IF NOT EXISTS acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  doc_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  access_token text UNIQUE,
  party_name text,
  party_email text,
  signature_url text,
  document_hash text,
  ip_address text,
  user_agent text,
  expires_at timestamptz,
  mifiel_document_id text,
  mifiel_certificate_url text,
  nom151_timestamp timestamptz
);

CREATE TABLE IF NOT EXISTS read_logs (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  access_token text,
  seconds int
);

CREATE INDEX IF NOT EXISTS idx_acceptances_doc_id ON acceptances(doc_id);
CREATE INDEX IF NOT EXISTS idx_acceptances_token ON acceptances(access_token);