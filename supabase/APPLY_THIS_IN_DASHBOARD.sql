-- ============================================
-- VerifySign - Complete Database Setup
-- ============================================
-- Ejecuta este SQL en: Supabase Dashboard → SQL Editor
-- Proyecto: https://supabase.com/dashboard/project/uiyojopjbhooxrmamaiw
-- ============================================

-- STEP 1: Drop old anchors table if exists
DROP TABLE IF EXISTS anchors CASCADE;

-- STEP 2: Create anchors table with correct schema
CREATE TABLE anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,  -- References documents(id), we'll add FK if documents exists
  user_id UUID REFERENCES auth.users(id),
  document_hash TEXT NOT NULL,
  anchor_type TEXT NOT NULL DEFAULT 'opentimestamps',
  anchor_status TEXT NOT NULL DEFAULT 'queued' CHECK (anchor_status IN ('queued', 'pending', 'processing', 'confirmed', 'failed')),

  -- OpenTimestamps specific fields
  ots_proof TEXT,
  ots_calendar_url TEXT,
  bitcoin_tx_id TEXT,
  bitcoin_block_height INTEGER,

  -- Notification tracking
  user_email TEXT,
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  confirmed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_bitcoin_tx CHECK (
    (anchor_status = 'confirmed' AND bitcoin_tx_id IS NOT NULL) OR
    (anchor_status != 'confirmed')
  )
);

COMMENT ON TABLE anchors IS 'Blockchain anchoring requests and proofs';

-- Indexes
CREATE INDEX idx_anchors_document_hash ON anchors(document_hash);
CREATE INDEX idx_anchors_status ON anchors(anchor_status);
CREATE INDEX idx_anchors_created_at ON anchors(created_at DESC);
CREATE INDEX idx_anchors_user ON anchors(user_id);
CREATE INDEX idx_anchors_pending ON anchors(anchor_status) WHERE anchor_status IN ('queued', 'pending', 'processing');

-- Enable RLS
ALTER TABLE anchors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own anchors"
  ON anchors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own anchors"
  ON anchors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view confirmed anchors"
  ON anchors FOR SELECT
  USING (anchor_status = 'confirmed');

CREATE POLICY "Service role can update anchors"
  ON anchors FOR UPDATE
  USING (true);

-- Grants
GRANT SELECT, INSERT ON anchors TO authenticated;
GRANT ALL ON anchors TO service_role;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_anchors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER anchors_updated_at
  BEFORE UPDATE ON anchors
  FOR EACH ROW
  EXECUTE FUNCTION update_anchors_updated_at();

-- STEP 3: Create integration_requests table if not exists
CREATE TABLE IF NOT EXISTS integration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  action TEXT NOT NULL,
  document_id UUID,
  user_id UUID REFERENCES auth.users(id),
  document_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_intent_id TEXT,
  external_service_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE integration_requests IS 'External service integration requests (SignNow, Mifiel, etc.)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integration_requests_service ON integration_requests(service);
CREATE INDEX IF NOT EXISTS idx_integration_requests_status ON integration_requests(status);
CREATE INDEX IF NOT EXISTS idx_integration_requests_user ON integration_requests(user_id);

-- Enable RLS
ALTER TABLE integration_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own integration requests" ON integration_requests;
DROP POLICY IF EXISTS "Users can insert their own integration requests" ON integration_requests;

CREATE POLICY "Users can view their own integration requests"
  ON integration_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integration requests"
  ON integration_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grants
GRANT SELECT, INSERT ON integration_requests TO authenticated;
GRANT ALL ON integration_requests TO service_role;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_integration_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS integration_requests_updated_at ON integration_requests;
CREATE TRIGGER integration_requests_updated_at
  BEFORE UPDATE ON integration_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_requests_updated_at();

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que las tablas se crearon correctamente
SELECT
  table_name,
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('anchors', 'integration_requests')
ORDER BY table_name;

-- Debería mostrar:
-- anchors              | 17
-- integration_requests | 10

-- ============================================
-- ✅ DONE!
-- ============================================

-- Ahora puedes:
-- 1. Desplegar las Edge Functions (ver DEPLOY_QUICKSTART.md)
-- 2. Configurar variables de entorno
-- 3. Probar la app
