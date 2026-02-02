-- Make signature-completed notifications idempotent
-- Contract: workflow_notifications are side-effects and MUST be idempotent.
-- Fixes: duplicate key value violates unique constraint "unq_workflow_signer_notification_step"

CREATE OR REPLACE FUNCTION notify_signature_completed()
RETURNS TRIGGER AS $$
DECLARE
  workflow_title TEXT;
  owner_email TEXT;
BEGIN
  -- Solo ejecutar si el estado cambió a 'signed'
  IF NEW.status = 'signed' AND (OLD.status IS NULL OR OLD.status != 'signed') THEN

    -- If D5 (notifications) is under canonical authority, skip direct notifications.
    IF public.is_decision_under_canonical_authority('D5_NOTIFICATIONS_ENABLED') THEN
      RAISE NOTICE 'Notification trigger: D5 under canonical authority, skipping direct notifications for signer % (workflow %)', NEW.email, NEW.workflow_id;
      RETURN NEW;
    END IF;

    -- Obtener información del workflow y owner
    SELECT
      sw.original_filename,
      u.email
    INTO workflow_title, owner_email
    FROM signature_workflows sw
    LEFT JOIN auth.users u ON u.id = sw.owner_id
    WHERE sw.id = NEW.workflow_id;

    -- Notificar al owner que alguien firmó (idempotente)
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
      'signature_completed',
      '✍️ Firma completada: ' || workflow_title,
      format(
        '<html><body><h2>Nueva firma recibida</h2><p><strong>%s</strong> (%s) completó su firma del documento <strong>"%s"</strong>.</p><p>Firmado el: %s</p></body></html>',
        COALESCE(NEW.name, 'Usuario'),
        NEW.email,
        workflow_title,
        to_char(NOW(), 'DD/MM/YYYY HH24:MI')
      ),
      'pending'
    )
    ON CONFLICT ON CONSTRAINT unq_workflow_signer_notification_step DO NOTHING;

    -- Notificar al firmante que su firma fue exitosa (idempotente)
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
      NEW.email,
      'signer',
      NEW.id,
      'signature_completed',
      '✅ Tu firma fue registrada: ' || workflow_title,
      format(
        '<html><body><h2>¡Firma exitosa!</h2><p>Tu firma del documento <strong>"%s"</strong> fue registrada exitosamente.</p><p>Firmado el: %s</p><p>Recibirás una notificación cuando el documento esté completado por todos los participantes.</p></body></html>',
        workflow_title,
        to_char(NOW(), 'DD/MM/YYYY HH24:MI')
      ),
      'pending'
    )
    ON CONFLICT ON CONSTRAINT unq_workflow_signer_notification_step DO NOTHING;

    RAISE NOTICE 'Notificaciones de firma completada creadas (idempotente) para signer % (workflow %)', NEW.email, NEW.workflow_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
