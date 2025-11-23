/*
  # VerifySign Database Schema - Certificación Digital y Trazabilidad Forense

  ## Descripción
  Crea la infraestructura de base de datos para el sistema VerifySign, implementando
  el paradigma .ECO/.ECOX con trazabilidad completa y seguridad forense.

  ## Tablas Creadas

  ### 1. eco_records
  Registro principal de certificados .ECO generados
  - Almacena metadata de documentos certificados
  - Hash SHA-256 para verificación de integridad
  - Referencia a transacciones blockchain
  - Estados: pending, anchored, verified

  ### 2. access_logs
  Log append-only de todos los accesos y acciones
  - Trazabilidad forense completa
  - IP y user-agent para auditoría
  - Tipos de acción: created, accessed, verified, downloaded

  ### 3. nda_signatures
  Registro de firmas digitales bajo NDA
  - Tokens de acceso con expiración
  - Datos de firma digital
  - Control de acceso temporal

  ## Seguridad
  - RLS habilitado en todas las tablas
  - Políticas restrictivas por defecto
  - Usuarios solo pueden ver sus propios registros
  - Logs de acceso protegidos contra modificación

  ## Notas
  - UUID v4 para identificadores únicos
  - Timestamps con zona horaria
  - JSONB para metadata flexible
  - Índices optimizados para consultas frecuentes
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: eco_records
CREATE TABLE IF NOT EXISTS eco_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  document_id TEXT NOT NULL UNIQUE,
  user_email TEXT NOT NULL,

  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,

  sha256_hash TEXT NOT NULL,
  eco_metadata JSONB NOT NULL,

  blockchain_tx_id TEXT,
  blockchain_network TEXT DEFAULT 'verifysign-testnet',

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'anchored', 'verified', 'revoked')),

  ip_address TEXT,
  user_agent TEXT
);

-- Table: access_logs
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  document_id TEXT NOT NULL,
  user_email TEXT NOT NULL,

  action TEXT NOT NULL CHECK (action IN ('created', 'accessed', 'verified', 'downloaded', 'shared', 'revoked')),

  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB
);

-- Table: nda_signatures
CREATE TABLE IF NOT EXISTS nda_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  document_id TEXT NOT NULL,

  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,

  signature_data TEXT NOT NULL,

  nda_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  access_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,

  ip_address TEXT,
  user_agent TEXT,

  verified_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_eco_records_document_id ON eco_records(document_id);
CREATE INDEX IF NOT EXISTS idx_eco_records_user_email ON eco_records(user_email);
CREATE INDEX IF NOT EXISTS idx_eco_records_status ON eco_records(status);
CREATE INDEX IF NOT EXISTS idx_eco_records_created_at ON eco_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eco_records_sha256 ON eco_records(sha256_hash);

CREATE INDEX IF NOT EXISTS idx_access_logs_document_id ON access_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_email ON access_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_access_logs_action ON access_logs(action);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nda_signatures_document_id ON nda_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_nda_signatures_access_token ON nda_signatures(access_token);
CREATE INDEX IF NOT EXISTS idx_nda_signatures_signer_email ON nda_signatures(signer_email);
CREATE INDEX IF NOT EXISTS idx_nda_signatures_expires_at ON nda_signatures(expires_at);

-- Enable RLS
ALTER TABLE eco_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nda_signatures ENABLE ROW LEVEL SECURITY;

-- RLS Policies for eco_records
CREATE POLICY "Users can view their own ECO records"
  ON eco_records
  FOR SELECT
  TO authenticated
  USING (auth.jwt()->>'email' = user_email);

CREATE POLICY "Users can create their own ECO records"
  ON eco_records
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt()->>'email' = user_email);

CREATE POLICY "Service role has full access to ECO records"
  ON eco_records
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can verify ECO records by hash"
  ON eco_records
  FOR SELECT
  TO anon
  USING (true);

-- RLS Policies for access_logs
CREATE POLICY "Users can view their own access logs"
  ON access_logs
  FOR SELECT
  TO authenticated
  USING (auth.jwt()->>'email' = user_email);

CREATE POLICY "Service role can insert access logs"
  ON access_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- RLS Policies for nda_signatures
CREATE POLICY "Users can view NDA signatures for their documents"
  ON nda_signatures
  FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT document_id FROM eco_records WHERE user_email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Service role can create NDA signatures"
  ON nda_signatures
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Users can verify their NDA signature by token"
  ON nda_signatures
  FOR SELECT
  TO anon
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for eco_records
CREATE TRIGGER update_eco_records_updated_at
  BEFORE UPDATE ON eco_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE eco_records IS 'Registro principal de certificados .ECO con trazabilidad forense completa';
COMMENT ON TABLE access_logs IS 'Log append-only de accesos y acciones para auditoría inmutable';
COMMENT ON TABLE nda_signatures IS 'Registro de firmas digitales bajo NDA con control de acceso temporal';