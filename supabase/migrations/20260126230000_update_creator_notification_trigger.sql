-- ============================================
-- Migration: Update creator notification trigger with feature flags
-- Fecha: 2026-01-26
-- Descripción: Actualiza el trigger de notificación al creador para usar feature flags que controlan autoridad canónica
-- ============================================

-- ============================================
-- FUNCIÓN ACTUALIZADA: notify_creator_on_signature con checks de flags
-- ============================================
CREATE OR REPLACE FUNCTION notify_creator_on_signature()
RETURNS TRIGGER AS $$
DECLARE
  workflow_title TEXT;
  owner_email TEXT;
  owner_name TEXT;
  current_hash TEXT;
BEGIN
  -- Solo ejecutar si el estado cambió a 'signed'
  IF NEW.status = 'signed' AND (OLD.status IS NULL OR OLD.status != 'signed') THEN

    -- Check if D5 (notifications) decision is under canonical authority
    -- If so, this trigger should not execute (executor handles it)
    IF public.is_decision_under_canonical_authority('D5_NOTIFICATIONS_ENABLED') THEN
      RAISE NOTICE 'Notification trigger: D5 under canonical authority, skipping creator notification for workflow % - signer %', NEW.workflow_id, NEW.email;
      RETURN NEW;
    END IF;

    -- Obtener información del workflow y owner
    SELECT
      sw.original_filename,
      u.email,
      COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
      sw.document_hash
    INTO workflow_title, owner_email, owner_name, current_hash
    FROM signature_workflows sw
    LEFT JOIN auth.users u ON u.id = sw.owner_id
    WHERE sw.id = NEW.workflow_id;

    -- Insertar notificación adicional para el creador (diferente al que ya existe)
    -- Este email tiene más detalles técnicos para el owner
    INSERT INTO workflow_notifications (
      workflow_id,
      recipient_email,
      recipient_type,
      signer_id,
      notification_type,
      subject,
      body_html,
      delivery_status
    ) VALUES (
      NEW.workflow_id,
      owner_email,
      'owner',
      NEW.id,
      'creator_detailed_notification',
      '🔔 Nueva Firma Recibida: ' || COALESCE(NEW.name, 'Usuario') || ' firmó ' || workflow_title,
      format(
        '<html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #111827;">Nueva Firma Registrada</h1>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0;">Detalles de la Firma</h2>
            <p><strong>Firmante:</strong> %s (%s)</p>
            <p><strong>Documento:</strong> %s</p>
            <p><strong>Fecha y Hora:</strong> %s</p>
            <p><strong>Smart Hash:</strong> <code style="background: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">%s</code></p>
          </div>

          <div style="margin: 30px 0;">
            <p>Esta firma ha sido registrada con evidencia forense completa en el sistema ECOX.</p>
            <p>Puedes verificar el estado completo del documento en tu dashboard.</p>
          </div>

          <a href="https://app.ecosign.app/dashboard/workflows/%s"
             style="display: inline-block; background-color: #111827; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Ver Detalles del Workflow
          </a>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
            <p>Este es un email automático del sistema EcoSign.</p>
            <p>La certeza forense de esta firma está respaldada por el registro ECOX completo.</p>
          </div>
        </body>
        </html>',
        COALESCE(NEW.name, 'Usuario sin nombre'),
        NEW.email,
        workflow_title,
        to_char(NOW(), 'DD/MM/YYYY HH24:MI:SS UTC'),
        COALESCE(current_hash, 'Pendiente de cálculo'),
        NEW.workflow_id
      ),
      'pending'
    );

    RAISE NOTICE 'Notificación detallada para creador enviada: workflow % - firmante %', NEW.workflow_id, NEW.email;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICACIÓN
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Función de notificación al creador actualizada con checks de feature flags';
  RAISE NOTICE 'Ahora verifica: is_decision_under_canonical_authority(''D5_NOTIFICATIONS_ENABLED'')';
END $$;