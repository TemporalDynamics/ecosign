-- Reset notifications: use workflow_completed_simple without ECO links (precanonical reset)

-- Extend notification types
ALTER TABLE public.workflow_notifications
  DROP CONSTRAINT IF EXISTS workflow_notifications_notification_type_check;

ALTER TABLE public.workflow_notifications
  ADD CONSTRAINT workflow_notifications_notification_type_check
  CHECK (notification_type = ANY (ARRAY[
    'workflow_started',
    'your_turn_to_sign',
    'signature_completed',
    'signature_evidence_ready',
    'change_requested',
    'change_accepted',
    'change_rejected',
    'new_version_ready',
    'workflow_completed',
    'workflow_completed_simple',
    'workflow_cancelled',
    'signature_request',
    'signature_reminder',
    'system',
    'other',
    'polygon_confirmed',
    'bitcoin_confirmed',
    'owner_document_signed',
    'signer_copy_ready',
    'welcome_founder',
    'creator_detailed_notification',
    'artifact_ready'
  ]));

-- Replace workflow completed trigger to emit simple mail only
CREATE OR REPLACE FUNCTION notify_workflow_completed()
RETURNS TRIGGER AS $$
DECLARE
  signer_record RECORD;
  workflow_title TEXT;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    workflow_title := NEW.original_filename;

    -- Notify owner (simple, no ECO)
    INSERT INTO workflow_notifications (
      workflow_id,
      recipient_email,
      recipient_type,
      notification_type,
      step,
      subject,
      body_html,
      delivery_status
    )
    SELECT
      NEW.id,
      u.email,
      'owner',
      'workflow_completed_simple',
      'completion_notice',
      '✅ Proceso de firmas completado: ' || workflow_title,
      format(
        '<html><body><h2>Proceso completado</h2><p>El documento <strong>"%s"</strong> fue firmado por todos los participantes.</p></body></html>',
        workflow_title
      ),
      'pending'
    FROM auth.users u
    WHERE u.id = NEW.owner_id;

    -- Notify all signed signers (simple, no ECO)
    FOR signer_record IN
      SELECT
        ws.email,
        ws.name,
        ws.signed_at
      FROM workflow_signers ws
      WHERE ws.workflow_id = NEW.id
        AND ws.status = 'signed'
    LOOP
      INSERT INTO workflow_notifications (
        workflow_id,
        recipient_email,
        recipient_type,
        notification_type,
        step,
        subject,
        body_html,
        delivery_status
      ) VALUES (
        NEW.id,
        signer_record.email,
        'signer',
        'workflow_completed_simple',
        'completion_notice',
        '✅ Proceso de firmas completado: ' || workflow_title,
        format(
          '<html><body><h2>Proceso completado</h2><p>El documento <strong>"%s"</strong> que firmaste fue completado por todos los participantes.</p></body></html>',
          workflow_title
        ),
        'pending'
      );
    END LOOP;

    RAISE NOTICE 'Notificaciones workflow_completed_simple creadas para workflow %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_workflow_completed IS
  'Precanonical reset: envía workflow_completed_simple sin ECO ni links.';
