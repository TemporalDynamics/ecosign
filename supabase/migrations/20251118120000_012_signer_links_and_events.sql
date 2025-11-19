-- Migración 012: Tablas para GuestSign Links y Event ChainLog
-- Fecha: 2025-11-18
-- Descripción: Infraestructura MVP para firmas invitadas y registro de eventos

-- =====================================================
-- TABLA: signer_links
-- Propósito: Tokens únicos para firmantes invitados
-- =====================================================
CREATE TABLE IF NOT EXISTS public.signer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Asociación
  document_id UUID NOT NULL REFERENCES public.user_documents(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Datos del firmante
  signer_email TEXT NOT NULL,
  signer_name TEXT, -- Se completa cuando el firmante se identifica
  signer_company TEXT,
  signer_job_title TEXT,

  -- Token de acceso
  token TEXT NOT NULL UNIQUE, -- Token único para el link (UUID)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  -- Estado del proceso
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'opened', 'identified', 'signed', 'expired')),

  -- Datos forenses
  opened_at TIMESTAMPTZ,
  opened_ip INET,
  opened_user_agent TEXT,

  signed_at TIMESTAMPTZ,
  signed_ip INET,
  signed_user_agent TEXT,

  -- Firma (data URL base64)
  signature_data_url TEXT,

  -- NDA acceptance
  nda_accepted BOOLEAN DEFAULT FALSE,
  nda_accepted_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_signer_links_token ON public.signer_links(token);
CREATE INDEX idx_signer_links_document ON public.signer_links(document_id);
CREATE INDEX idx_signer_links_owner ON public.signer_links(owner_id);
CREATE INDEX idx_signer_links_status ON public.signer_links(status);
CREATE INDEX idx_signer_links_email ON public.signer_links(signer_email);

-- Trigger para updated_at
CREATE TRIGGER update_signer_links_updated_at
  BEFORE UPDATE ON public.signer_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLA: events
-- Propósito: ChainLog - Registro de todos los eventos
-- =====================================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Asociación
  document_id UUID NOT NULL REFERENCES public.user_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL si es guest signer
  signer_link_id UUID REFERENCES public.signer_links(id) ON DELETE SET NULL,

  -- Tipo de evento
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created',          -- Documento creado
    'sent',             -- Link enviado a firmante
    'opened',           -- Link abierto por firmante
    'identified',       -- Firmante completó identificación
    'signed',           -- Firmante aplicó firma
    'anchored_polygon', -- Anclado en Polygon
    'anchored_bitcoin', -- Anclado en Bitcoin
    'verified',         -- Documento verificado
    'downloaded',       -- .ECO descargado
    'expired'           -- Link expirado
  )),

  -- Datos forenses
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,

  -- Metadata del evento (JSON)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Actor del evento
  actor_email TEXT, -- Email del firmante o usuario
  actor_name TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para queries eficientes
CREATE INDEX idx_events_document ON public.events(document_id);
CREATE INDEX idx_events_user ON public.events(user_id);
CREATE INDEX idx_events_signer_link ON public.events(signer_link_id);
CREATE INDEX idx_events_type ON public.events(event_type);
CREATE INDEX idx_events_timestamp ON public.events(timestamp DESC);
CREATE INDEX idx_events_document_timestamp ON public.events(document_id, timestamp DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- signer_links: Owner puede ver/editar sus links
ALTER TABLE public.signer_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own signer links"
  ON public.signer_links
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create signer links"
  ON public.signer_links
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own signer links"
  ON public.signer_links
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- events: Owner del documento puede ver eventos
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for own documents"
  ON public.events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_documents
      WHERE user_documents.id = events.document_id
      AND user_documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create events"
  ON public.events
  FOR INSERT
  WITH CHECK (true); -- Cualquiera puede crear eventos (incluye guest signers)

-- =====================================================
-- FUNCIÓN: Expirar links automáticamente
-- =====================================================
CREATE OR REPLACE FUNCTION expire_signer_links()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.signer_links
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE
    expires_at < NOW()
    AND status NOT IN ('signed', 'expired');
END;
$$;

-- Comentarios
COMMENT ON TABLE public.signer_links IS 'Tokens únicos para firmantes invitados (GuestSign)';
COMMENT ON TABLE public.events IS 'ChainLog - Registro completo de eventos del documento';
COMMENT ON COLUMN public.events.metadata IS 'Datos adicionales del evento en formato JSON';
