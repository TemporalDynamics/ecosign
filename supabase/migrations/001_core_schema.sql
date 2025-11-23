-- ========================================
-- VerifySign - Core Database Schema
-- Version: 1.0.1 (Patched for robustness)
-- Date: 2025-11-15
-- ========================================
-- Este esquema está alineado con:
-- - Netlify Functions (generate-link, verify-access, log-event)
-- - Nombres de columnas usados en el código TypeScript
-- ========================================

-- ========================================
-- EXTENSIONS
-- ========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- TABLES
-- ========================================

-- Tabla: documents
-- Documentos certificados con hash .ECO
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  original_filename TEXT,
  eco_hash TEXT NOT NULL,          -- SHA-256 del archivo .ECO
  ecox_hash TEXT,                  -- SHA-256 del archivo .ECOX (opcional)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ========================================
-- SCHEMA PATCH (to fix sync issues)
-- ========================================
-- Add columns if they don't exist on an older version of the table
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS ecox_hash TEXT;
-- Add other missing columns here if needed in the future, for example:
-- ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS new_column_name TEXT;

-- ========================================
-- COMMENTS AND INDEXES
-- ========================================

COMMENT ON TABLE documents IS 'Documentos certificados por VerifySign';
COMMENT ON COLUMN documents.eco_hash IS 'SHA-256 del certificado .ECO';
COMMENT ON COLUMN documents.ecox_hash IS 'SHA-256 del archivo .ECOX con trazabilidad completa';

-- Tabla: links
-- Enlaces únicos para compartir documentos
CREATE TABLE IF NOT EXISTS links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,  -- SHA-256 del token (64 chars hex plaintext)
  expires_at TIMESTAMPTZ,            -- NULL = sin expiración
  revoked_at TIMESTAMPTZ,            -- NULL = activo
  require_nda BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE links IS 'Enlaces seguros para compartir documentos';
COMMENT ON COLUMN links.token_hash IS 'Hash SHA-256 del token (no almacenar plaintext)';
COMMENT ON COLUMN links.require_nda IS 'Si TRUE, receptor debe aceptar NDA antes de acceder';

-- Tabla: recipients
-- Receptores de documentos compartidos
CREATE TABLE IF NOT EXISTS recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  recipient_id TEXT NOT NULL UNIQUE,  -- ID único hex (16 bytes) para tracking
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE recipients IS 'Receptores de documentos compartidos';
COMMENT ON COLUMN recipients.recipient_id IS 'ID único para tracking en .ECOX (no sensible)';

-- Tabla: nda_acceptances
-- Registro de aceptación de NDAs
CREATE TABLE IF NOT EXISTS nda_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE NOT NULL,
  eco_nda_hash TEXT NOT NULL,       -- Hash del NDA firmado
  accepted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  ip_address INET,
  user_agent TEXT,
  signature_data JSONB              -- Metadatos adicionales (browser fingerprint, etc.)
);

COMMENT ON TABLE nda_acceptances IS 'Registro de aceptaciones de NDA (no-repudiación)';
COMMENT ON COLUMN nda_acceptances.signature_data IS 'Metadatos: browser fingerprint, token usado, etc.';

-- Tabla: access_events
-- Log de accesos (auditoría / VerifyTracker)
CREATE TABLE IF NOT EXISTS access_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'download', 'forward')),
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
  ip_address INET,
  user_agent TEXT,
  country TEXT,                     -- Código ISO de país (geolocalización)
  session_id TEXT
);

COMMENT ON TABLE access_events IS 'Log de accesos para auditoría y trazabilidad';
COMMENT ON COLUMN access_events.event_type IS 'Tipo de evento: view, download, forward';

-- Tabla: anchors
-- Anclajes en blockchain (OpenTimestamps, Polygon, etc.)
CREATE TABLE IF NOT EXISTS anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  chain TEXT NOT NULL CHECK (chain IN ('bitcoin', 'polygon', 'ethereum')),
  tx_id TEXT NOT NULL,              -- Transaction ID en blockchain
  proof_url TEXT,                   -- URL del proof file (.ots, etc.)
  anchored_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE anchors IS 'Anclajes de documentos en blockchain';
COMMENT ON COLUMN anchors.proof_url IS 'URL del archivo de prueba (OpenTimestamps .ots)';

-- ========================================
-- ÍNDICES (Performance)
-- ========================================

CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_links_token ON links(token_hash);
CREATE INDEX IF NOT EXISTS idx_links_document ON links(document_id);
CREATE INDEX IF NOT EXISTS idx_links_active ON links(document_id) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_recipients_document ON recipients(document_id);
CREATE INDEX IF NOT EXISTS idx_recipients_email ON recipients(email);
CREATE INDEX IF NOT EXISTS idx_recipients_recipient_id ON recipients(recipient_id);

CREATE INDEX IF NOT EXISTS idx_nda_acceptances_recipient ON nda_acceptances(recipient_id);
CREATE INDEX IF NOT EXISTS idx_nda_acceptances_timestamp ON nda_acceptances(accepted_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_events_recipient ON access_events(recipient_id);
CREATE INDEX IF NOT EXISTS idx_access_events_timestamp ON access_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_access_events_type ON access_events(event_type);

CREATE INDEX IF NOT EXISTS idx_anchors_document ON anchors(document_id);
CREATE INDEX IF NOT EXISTS idx_anchors_chain ON anchors(chain);

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Habilitar RLS en todas las tablas
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE nda_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE anchors ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICIES: documents
-- ========================================

-- Owners pueden ver sus propios documentos
CREATE POLICY "Owners can view their documents"
ON documents FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

-- Owners pueden insertar documentos
CREATE POLICY "Owners can insert documents"
ON documents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Owners pueden actualizar sus propios documentos
CREATE POLICY "Owners can update their documents"
ON documents FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id);

-- ========================================
-- RLS POLICIES: links
-- ========================================

-- Owners pueden ver links de sus documentos
CREATE POLICY "Owners can view links for their documents"
ON links FOR SELECT
TO authenticated
USING (
  auth.uid() = (SELECT owner_id FROM documents WHERE id = document_id)
);

-- Owners pueden crear links
CREATE POLICY "Owners can insert links"
ON links FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = (SELECT owner_id FROM documents WHERE id = document_id)
);

-- Owners pueden actualizar (revocar) links
CREATE POLICY "Owners can update their links"
ON links FOR UPDATE
TO authenticated
USING (
  auth.uid() = (SELECT owner_id FROM documents WHERE id = document_id)
);

-- ========================================
-- RLS POLICIES: recipients
-- ========================================

-- Owners pueden ver recipients de sus documentos
CREATE POLICY "Owners can view recipients for their documents"
ON recipients FOR SELECT
TO authenticated
USING (
  auth.uid() = (SELECT owner_id FROM documents WHERE id = document_id)
);

-- Recipients pueden ver su propio registro (vía email en JWT)
CREATE POLICY "Recipients can view their own record"
ON recipients FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'email' = email
);

-- ========================================
-- RLS POLICIES: nda_acceptances
-- ========================================
CREATE POLICY "Owners can view NDA acceptances"
ON nda_acceptances FOR SELECT
TO authenticated
USING (
  auth.uid() = (
    SELECT d.owner_id FROM documents d
    JOIN recipients r ON r.document_id = d.id
    WHERE r.id = nda_acceptances.recipient_id  --
  )
);
-- Service role puede insertar (via Netlify Functions)
-- No policy necesaria aquí, se hace con service_role_key

-- ========================================
-- RLS POLICIES: access_events
-- ========================================
-- Owners pueden ver access events de sus documentos
CREATE POLICY "Owners can view access events"
ON access_events FOR SELECT
TO authenticated
USING (
  auth.uid() = (
    SELECT d.owner_id FROM documents d
    JOIN recipients r ON r.document_id = d.id
    WHERE r.id = access_events.recipient_id  -- ✅ ARREGLADO
  )
);
-- Service role puede insertar (via Netlify Functions)
-- NOTA: Esta tabla es APPEND-ONLY desde el punto de vista del usuario

-- ========================================
-- RLS POLICIES: anchors
-- ========================================

-- Owners pueden ver anchors de sus documentos
CREATE POLICY "Owners can view anchors"
ON anchors FOR SELECT
TO authenticated
USING (
  auth.uid() = (SELECT owner_id FROM documents WHERE id = document_id)
);

-- Service role puede insertar (via Netlify Functions)

-- ========================================
-- FUNCIONES AUXILIARES
-- ========================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para documents.updated_at
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VERIFICACIÓN DE INTEGRIDAD
-- ========================================


-- Función para validar que el documento no esté revocado
CREATE OR REPLACE FUNCTION check_document_not_revoked()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM documents
    WHERE id = NEW.document_id AND status = 'revoked'
  ) THEN
    RAISE EXCEPTION 'Cannot create link for revoked document';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar en INSERT
DROP TRIGGER IF EXISTS validate_document_not_revoked ON links;
CREATE TRIGGER validate_document_not_revoked
  BEFORE INSERT ON links
  FOR EACH ROW
  EXECUTE FUNCTION check_document_not_revoked();

-- Constraint: expires_at debe ser futuro (este sí se puede hacer con CHECK)
ALTER TABLE links ADD CONSTRAINT links_expires_at_future_check
CHECK (expires_at IS NULL OR expires_at > created_at);

-- ========================================
-- GRANTS (Permisos)
-- ========================================

-- Usuarios autenticados pueden usar las tablas vía RLS
GRANT SELECT, INSERT, UPDATE ON documents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON links TO authenticated;
GRANT SELECT ON recipients TO authenticated;
GRANT SELECT ON nda_acceptances TO authenticated;
GRANT SELECT ON access_events TO authenticated;
GRANT SELECT ON anchors TO authenticated;

-- Service role tiene acceso completo (usado por Netlify Functions)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ========================================
-- DATOS DE EJEMPLO (Desarrollo)
-- ========================================

-- Descomentar para testing local:
-- INSERT INTO documents (owner_id, title, eco_hash) VALUES
-- ('00000000-0000-0000-0000-000000000000', 'Test Document', 'abc123def456...');

-- ========================================
-- FIN DE MIGRACIÓN
-- ========================================
