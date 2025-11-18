-- Migration: Sistema de Flujos de Firma Multi-Parte
-- Soporta firma secuencial, modificaciones, versionado y tracking completo

-- Tabla: signature_workflows
-- Representa un flujo completo de firmas (puede tener múltiples versiones)
CREATE TABLE IF NOT EXISTS signature_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Documento original
  original_filename TEXT NOT NULL,
  original_file_url TEXT, -- Storage URL del documento original
  current_version INTEGER DEFAULT 1 NOT NULL,

  -- Estado del workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',           -- Usuario A configurando
    'active',          -- En proceso de firmas
    'paused',          -- Pausado por solicitud de cambios
    'completed',       -- Todas las firmas completadas
    'cancelled'        -- Cancelado por Usuario A
  )),

  -- Configuración de blindaje forense
  forensic_config JSONB DEFAULT '{
    "rfc3161": true,
    "polygon": true,
    "bitcoin": false
  }'::jsonb,

  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX idx_workflows_owner ON signature_workflows(owner_id);
CREATE INDEX idx_workflows_status ON signature_workflows(status);

COMMENT ON TABLE signature_workflows IS 'Flujos de firma multi-parte con versionado';

-- Tabla: workflow_versions
-- Cada modificación crea una nueva versión
CREATE TABLE IF NOT EXISTS workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES signature_workflows(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,

  -- Documento de esta versión
  document_url TEXT NOT NULL, -- Storage URL
  document_hash TEXT NOT NULL, -- SHA-256 del documento

  -- Razón del cambio
  change_reason TEXT, -- "initial" | "modification_by_signer_X" | "owner_revision"
  requested_by UUID REFERENCES auth.users(id), -- Quién solicitó el cambio
  modification_notes JSONB, -- Anotaciones/resaltados del solicitante

  -- Estado
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',      -- Versión actual en uso
    'superseded',  -- Reemplazada por nueva versión
    'archived'     -- Archivada
  )),

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_versions_workflow ON workflow_versions(workflow_id);
CREATE UNIQUE INDEX idx_versions_unique ON workflow_versions(workflow_id, version_number);

COMMENT ON TABLE workflow_versions IS 'Versiones del documento en el flujo de firma';

-- Tabla: workflow_signers
-- Firmantes en orden secuencial
CREATE TABLE IF NOT EXISTS workflow_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES signature_workflows(id) ON DELETE CASCADE NOT NULL,

  -- Orden y datos del firmante
  signing_order INTEGER NOT NULL, -- 1, 2, 3...
  email TEXT NOT NULL,
  name TEXT,

  -- Configuración de acceso
  require_login BOOLEAN DEFAULT false NOT NULL,
  require_nda BOOLEAN DEFAULT false NOT NULL,
  quick_access BOOLEAN DEFAULT false NOT NULL, -- Si está ON, solo email sin NDA/Login

  -- Estado
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',           -- Esperando su turno
    'ready',             -- Es su turno de firmar
    'signed',            -- Ya firmó
    'requested_changes', -- Solicitó modificaciones
    'skipped'            -- Saltado por cancelación
  )),

  -- Tracking (VerifyTracker)
  access_token_hash TEXT UNIQUE, -- Hash del token de acceso
  first_accessed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,

  -- Firma
  signature_data JSONB, -- Coordenadas, imagen de firma, etc.
  signature_hash TEXT,  -- Hash de la firma para verificación

  -- Modificaciones solicitadas
  change_request_data JSONB, -- Resaltados, comentarios
  change_request_at TIMESTAMPTZ,
  change_request_status TEXT CHECK (change_request_status IN (
    'pending', 'accepted', 'rejected'
  )),

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_signers_workflow ON workflow_signers(workflow_id);
CREATE INDEX idx_signers_order ON workflow_signers(workflow_id, signing_order);
CREATE INDEX idx_signers_status ON workflow_signers(status);

COMMENT ON TABLE workflow_signers IS 'Firmantes de un workflow en orden secuencial';

-- Tabla: workflow_signatures
-- Registro inmutable de cada firma (certificación forense)
CREATE TABLE IF NOT EXISTS workflow_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES signature_workflows(id) ON DELETE CASCADE NOT NULL,
  version_id UUID REFERENCES workflow_versions(id) ON DELETE CASCADE NOT NULL,
  signer_id UUID REFERENCES workflow_signers(id) ON DELETE CASCADE NOT NULL,

  -- Firma
  signature_image_url TEXT, -- Storage URL de la imagen de firma
  signature_coordinates JSONB, -- Posición en el PDF
  signature_hash TEXT NOT NULL, -- SHA-256 de la firma

  -- Certificación forense (Triple Anchoring)
  certification_data JSONB NOT NULL, -- eco_data completo
  eco_file_url TEXT, -- URL del .ECO generado
  ecox_file_url TEXT, -- URL del .ECOX si tiene blindaje

  -- Anchoring
  rfc3161_token TEXT, -- Token RFC 3161 si se solicitó
  polygon_tx_hash TEXT, -- Hash de tx en Polygon si se solicitó
  bitcoin_anchor_id UUID REFERENCES anchors(id), -- Referencia a anchor de Bitcoin

  -- Metadatos de auditoría
  ip_address TEXT,
  user_agent TEXT,
  geo_location JSONB, -- País, ciudad si está disponible

  signed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_signatures_workflow ON workflow_signatures(workflow_id);
CREATE INDEX idx_signatures_version ON workflow_signatures(version_id);
CREATE INDEX idx_signatures_signer ON workflow_signatures(signer_id);

COMMENT ON TABLE workflow_signatures IS 'Registro inmutable de firmas con certificación forense';

-- Tabla: workflow_notifications
-- Log de todos los emails enviados
CREATE TABLE IF NOT EXISTS workflow_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES signature_workflows(id) ON DELETE CASCADE NOT NULL,

  -- Destinatario
  recipient_email TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN (
    'owner',           -- Usuario A
    'signer',          -- Usuario B/C/etc
    'all_signers'      -- Broadcast a todos
  )),
  signer_id UUID REFERENCES workflow_signers(id), -- Si es para un signer específico

  -- Tipo de notificación
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'workflow_started',        -- Usuario A inició el flujo
    'your_turn_to_sign',       -- Es tu turno de firmar
    'signature_completed',     -- Completaste tu firma
    'change_requested',        -- Alguien solicitó cambios
    'change_accepted',         -- Cambios aceptados
    'change_rejected',         -- Cambios rechazados
    'new_version_ready',       -- Nueva versión lista para firmar
    'workflow_completed',      -- Flujo completado
    'workflow_cancelled'       -- Flujo cancelado
  )),

  -- Contenido
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,

  -- Estado de envío
  sent_at TIMESTAMPTZ,
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN (
    'pending', 'sent', 'delivered', 'failed', 'bounced'
  )),
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_notifications_workflow ON workflow_notifications(workflow_id);
CREATE INDEX idx_notifications_recipient ON workflow_notifications(recipient_email);
CREATE INDEX idx_notifications_status ON workflow_notifications(delivery_status);

COMMENT ON TABLE workflow_notifications IS 'Log completo de notificaciones del workflow';

-- Función: Obtener el siguiente firmante
CREATE OR REPLACE FUNCTION get_next_signer(p_workflow_id UUID)
RETURNS UUID AS $$
DECLARE
  v_next_signer_id UUID;
BEGIN
  -- Buscar el primer signer con status 'pending' en orden
  SELECT id INTO v_next_signer_id
  FROM workflow_signers
  WHERE workflow_id = p_workflow_id
    AND status = 'pending'
  ORDER BY signing_order ASC
  LIMIT 1;

  RETURN v_next_signer_id;
END;
$$ LANGUAGE plpgsql;

-- Función: Marcar siguiente firmante como 'ready'
CREATE OR REPLACE FUNCTION advance_workflow(p_workflow_id UUID)
RETURNS VOID AS $$
DECLARE
  v_next_signer_id UUID;
BEGIN
  -- Obtener siguiente firmante
  v_next_signer_id := get_next_signer(p_workflow_id);

  IF v_next_signer_id IS NOT NULL THEN
    -- Marcar como 'ready'
    UPDATE workflow_signers
    SET status = 'ready',
        updated_at = now()
    WHERE id = v_next_signer_id;
  ELSE
    -- No hay más firmantes - workflow completado
    UPDATE signature_workflows
    SET status = 'completed',
        completed_at = now(),
        updated_at = now()
    WHERE id = p_workflow_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Función: Crear nueva versión tras modificación
CREATE OR REPLACE FUNCTION create_workflow_version(
  p_workflow_id UUID,
  p_document_url TEXT,
  p_document_hash TEXT,
  p_change_reason TEXT,
  p_requested_by UUID,
  p_modification_notes JSONB
)
RETURNS UUID AS $$
DECLARE
  v_new_version INTEGER;
  v_version_id UUID;
BEGIN
  -- Marcar versión actual como superseded
  UPDATE workflow_versions
  SET status = 'superseded'
  WHERE workflow_id = p_workflow_id
    AND status = 'active';

  -- Calcular nuevo número de versión
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_new_version
  FROM workflow_versions
  WHERE workflow_id = p_workflow_id;

  -- Crear nueva versión
  INSERT INTO workflow_versions (
    workflow_id,
    version_number,
    document_url,
    document_hash,
    change_reason,
    requested_by,
    modification_notes,
    status
  ) VALUES (
    p_workflow_id,
    v_new_version,
    p_document_url,
    p_document_hash,
    p_change_reason,
    p_requested_by,
    p_modification_notes,
    'active'
  ) RETURNING id INTO v_version_id;

  -- Actualizar workflow
  UPDATE signature_workflows
  SET current_version = v_new_version,
      status = 'active',
      updated_at = now()
  WHERE id = p_workflow_id;

  -- Resetear firmantes pendientes
  UPDATE workflow_signers
  SET status = 'pending',
      updated_at = now()
  WHERE workflow_id = p_workflow_id
    AND status IN ('ready', 'pending');

  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE signature_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Owner puede ver y editar sus workflows
CREATE POLICY workflows_owner_access ON signature_workflows
  FOR ALL USING (auth.uid() = owner_id);

-- Policy: Signers pueden ver workflows donde están asignados
CREATE POLICY workflows_signer_access ON signature_workflows
  FOR SELECT USING (
    id IN (
      SELECT workflow_id FROM workflow_signers
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Policy: Versions - mismo acceso que workflows
CREATE POLICY versions_access ON workflow_versions
  FOR SELECT USING (
    workflow_id IN (
      SELECT id FROM signature_workflows
      WHERE owner_id = auth.uid()
        OR id IN (
          SELECT workflow_id FROM workflow_signers
          WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    )
  );

-- Policy: Signers - owner y el signer pueden ver
CREATE POLICY signers_access ON workflow_signers
  FOR SELECT USING (
    workflow_id IN (
      SELECT id FROM signature_workflows WHERE owner_id = auth.uid()
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Policy: Signatures - todos los involucrados pueden ver
CREATE POLICY signatures_access ON workflow_signatures
  FOR SELECT USING (
    workflow_id IN (
      SELECT id FROM signature_workflows
      WHERE owner_id = auth.uid()
        OR id IN (
          SELECT workflow_id FROM workflow_signers
          WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    )
  );

-- Policy: Notifications - solo el recipient puede ver sus notificaciones
CREATE POLICY notifications_access ON workflow_notifications
  FOR SELECT USING (
    recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR workflow_id IN (
      SELECT id FROM signature_workflows WHERE owner_id = auth.uid()
    )
  );
