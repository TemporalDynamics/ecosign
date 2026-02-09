-- Dead Letter Queue para notificaciones que agotan retries
-- Propósito: Auditar y monitorear mails que fallan permanentemente
-- Sin afectar tabla principal workflow_notifications

CREATE TABLE IF NOT EXISTS workflow_notifications_dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referencia a original
  original_notification_id UUID NOT NULL UNIQUE,

  -- Datos copiados desde workflow_notifications
  workflow_id UUID NOT NULL,
  recipient_email TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  subject TEXT,
  body_html TEXT,
  delivery_status TEXT,
  retry_count INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL,

  -- DLQ metadata
  moved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  move_reason TEXT NOT NULL, -- 'max_retries_exceeded', 'ancient_notification', etc.

  -- Índices para auditoría
  created_at_index TIMESTAMPTZ GENERATED ALWAYS AS (created_at) STORED,
  moved_at_index TIMESTAMPTZ GENERATED ALWAYS AS (moved_at) STORED
);

-- Índices para queries de auditoría
CREATE INDEX idx_workflow_notifications_dlq_workflow_id
  ON workflow_notifications_dlq(workflow_id);

CREATE INDEX idx_workflow_notifications_dlq_moved_at
  ON workflow_notifications_dlq(moved_at DESC);

CREATE INDEX idx_workflow_notifications_dlq_reason
  ON workflow_notifications_dlq(move_reason);

-- Comentario para documentación
COMMENT ON TABLE workflow_notifications_dlq IS
  'Dead Letter Queue para notificaciones que agotan reintentos. Auditoría y diagnóstico únicamente. No afecta flujo principal.';
