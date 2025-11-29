-- ============================================================================
-- Migración: Optimización del sistema de notificaciones
-- Descripción:
--   1. Crear índices para optimizar consultas de notificaciones pendientes
--   2. Agregar comentarios de documentación
--   3. Preparar constraints de idempotencia (opcional)
-- ============================================================================

-- ============================================================================
-- PARTE 1: Crear índices para optimizar consultas de notificaciones pendientes
-- ============================================================================

-- Este índice acelera el SELECT que hace send-pending-emails
-- Beneficio: consultas rápidas incluso con miles de filas
CREATE INDEX IF NOT EXISTS idx_notifications_status_created
  ON public.workflow_notifications (delivery_status, created_at);

-- Índice adicional para búsquedas por email (útil para debugging y consultas)
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_email
  ON public.workflow_notifications (recipient_email);

-- Índice para búsquedas por workflow_id (útil para auditoría)
CREATE INDEX IF NOT EXISTS idx_notifications_workflow_id
  ON public.workflow_notifications (workflow_id);

-- ============================================================================
-- PARTE 2: Agregar check constraint para prevenir regresiones de estado
-- ============================================================================

-- Opcional: Agregar una regla que impida que una fila 'sent' vuelva a 'pending'
-- NOTA: Esto es muy estricto. Solo descomenta si estás 100% seguro de que no necesitas
-- volver a enviar una notificación que ya fue enviada.

/*
CREATE OR REPLACE FUNCTION prevent_status_regression()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el estado anterior era 'sent' o 'failed', no permitir volver a 'pending'
  IF OLD.delivery_status IN ('sent', 'failed') AND NEW.delivery_status = 'pending' THEN
    RAISE EXCEPTION 'No se puede cambiar delivery_status de % a pending', OLD.delivery_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_status_regression
  BEFORE UPDATE ON public.workflow_notifications
  FOR EACH ROW
  EXECUTE FUNCTION prevent_status_regression();
*/

-- ============================================================================
-- PARTE 3: Comentarios y documentación en la tabla
-- ============================================================================

COMMENT ON TABLE public.workflow_notifications IS
  'Tabla de notificaciones de workflows. Cada fila representa un envío único de email.
   Estados: pending (pendiente), sent (enviado), failed (falló después de 3 intentos).
   La función send-pending-emails procesa automáticamente las filas con delivery_status=pending.';

COMMENT ON COLUMN public.workflow_notifications.retry_count IS
  'Contador de reintentos. Máximo 3 intentos antes de marcar como failed.';

COMMENT ON COLUMN public.workflow_notifications.delivery_status IS
  'Estado del envío: pending (esperando), sent (enviado exitosamente), failed (falló definitivamente).';

COMMENT ON COLUMN public.workflow_notifications.resend_email_id IS
  'ID del email en Resend. Útil para tracking y debugging en el dashboard de Resend.';

COMMENT ON COLUMN public.workflow_notifications.error_message IS
  'Mensaje de error completo de Resend (si hubo fallo). Formato: JSON con detalles del error.';
