-- Actualiza las plantillas de notificación post-firma (owner y firmante) y workflow completado
CREATE OR REPLACE FUNCTION notify_signature_completed()
RETURNS TRIGGER AS $$
DECLARE
  workflow_title TEXT;
  owner_email TEXT;
  display_signer TEXT;
  app_url TEXT;
BEGIN
  IF NEW.status = 'signed' AND (OLD.status IS NULL OR OLD.status != 'signed') THEN
    SELECT
      sw.original_filename,
      u.email
    INTO workflow_title, owner_email
    FROM signature_workflows sw
    LEFT JOIN auth.users u ON u.id = sw.owner_id
    WHERE sw.id = NEW.workflow_id;

    display_signer := COALESCE(NEW.name, NEW.email);
    app_url := COALESCE(current_setting('app.frontend_url', true), 'https://app.ecosign.app');

    -- Owner: firma completada
    IF owner_email IS NOT NULL THEN
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
        'owner_document_signed',
        display_signer || ' firmó ' || workflow_title,
        format(
          '<html><body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);">
              <p style="margin:0 0 8px;font-size:14px;color:#0f172a;">Hola,</p>
              <p style="margin:0 0 12px;font-size:16px;color:#0f172a;font-weight:bold;">%s firmó tu documento:</p>
              <p style="margin:0 0 16px;font-size:15px;color:#0f172a;"><strong>%s</strong></p>
              <p style="margin:16px 0;">
                <a href="%s/workflows/%s" style="display:inline-block;padding:14px 22px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Ver documento firmado</a>
              </p>
              <p style="margin:16px 0 0;font-size:14px;color:#0f172a;font-weight:600;">EcoSign. Transparencia que acompaña.</p>
            </div>
          </body></html>',
          display_signer,
          workflow_title,
          app_url,
          NEW.workflow_id
        ),
        'pending'
      );
    END IF;

    -- Firmante: copia lista
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
      'signer_copy_ready',
      'Tu copia firmada ya está lista',
      format(
        '<html><body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);">
            <p style="margin:0 0 8px;font-size:14px;color:#0f172a;">Hola %s,</p>
            <p style="margin:0 0 12px;font-size:16px;color:#0f172a;font-weight:bold;">Tu firma fue aplicada correctamente:</p>
            <p style="margin:0 0 16px;font-size:15px;color:#0f172a;"><strong>%s</strong></p>
            <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.5;">Descargá tus copias:</p>
            <p style="margin:12px 0 8px;">
              <a href="%s/sign/%s" style="display:inline-block;padding:12px 20px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Descargar PDF firmado</a>
            </p>
            <p style="margin:8px 0 16px;">
              <a href="%s/sign/%s" style="display:inline-block;padding:12px 20px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Descargar archivo ECO</a>
            </p>
            <p style="margin:8px 0 0;font-size:14px;color:#0f172a;font-weight:600;">Firmaste con la misma evidencia que recibe el remitente.</p>
            <p style="margin:4px 0 12px;font-size:14px;color:#0f172a;font-weight:600;">Tu firma te pertenece. Tu evidencia también.</p>
            <p style="margin:12px 0 0;font-size:14px;color:#0f172a;font-weight:600;">EcoSign. Transparencia que acompaña.</p>
            <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">Guardá este correo para tener tus copias cuando las necesites.</p>
          </div>
        </body></html>',
        display_signer,
        workflow_title,
        app_url,
        NEW.access_token_hash,
        app_url,
        NEW.access_token_hash
      ),
      'pending'
    );

    RAISE NOTICE 'Notificaciones de firma completada creadas para signer % (workflow %)', NEW.email, NEW.workflow_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Workflow completado (owner)
CREATE OR REPLACE FUNCTION notify_workflow_completed()
RETURNS TRIGGER AS $$
DECLARE
  signer_record RECORD;
  workflow_title TEXT;
  app_url TEXT;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    workflow_title := NEW.original_filename;
    app_url := COALESCE(current_setting('app.frontend_url', true), 'https://app.ecosign.app');

    -- Notificar al owner (creador del documento)
    INSERT INTO workflow_notifications (
      workflow_id,
      recipient_email,
      recipient_type,
      notification_type,
      subject,
      body_html,
      delivery_status
    )
    SELECT
      NEW.id,
      u.email,
      'owner',
      'workflow_completed',
      'Todas las firmas completadas',
      format(
        '<html><body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);">
            <p style="margin:0 0 8px;font-size:14px;color:#0f172a;">Hola,</p>
            <p style="margin:0 0 12px;font-size:16px;color:#0f172a;font-weight:bold;">El documento está completado por todos:</p>
            <p style="margin:0 0 16px;font-size:15px;color:#0f172a;"><strong>%s</strong></p>
            <p style="margin:16px 0;">
              <a href="%s/workflows/%s" style="display:inline-block;padding:14px 22px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Ver certificado</a>
            </p>
            <p style="margin:16px 0 0;font-size:14px;color:#0f172a;font-weight:600;">EcoSign. Transparencia que acompaña.</p>
          </div>
        </body></html>',
        workflow_title,
        app_url,
        NEW.id
      ),
      'pending'
    FROM auth.users u
    WHERE u.id = NEW.owner_id;

    -- Notificar a todos los firmantes
    FOR signer_record IN
      SELECT
        ws.email,
        COALESCE(ws.name, ws.email) AS display_name
      FROM workflow_signers ws
      WHERE ws.workflow_id = NEW.id
        AND ws.status = 'signed'
    LOOP
      INSERT INTO workflow_notifications (
        workflow_id,
        recipient_email,
        recipient_type,
        notification_type,
        subject,
        body_html,
        delivery_status
      ) VALUES (
        NEW.id,
        signer_record.email,
        'signer',
        'workflow_completed',
        'Documento completado',
        format(
          '<html><body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);">
              <p style="margin:0 0 8px;font-size:14px;color:#0f172a;">Hola %s,</p>
              <p style="margin:0 0 12px;font-size:16px;color:#0f172a;font-weight:bold;">El documento que firmaste está completo:</p>
              <p style="margin:0 0 16px;font-size:15px;color:#0f172a;"><strong>%s</strong></p>
              <p style="margin:16px 0;">
                <a href="%s/workflows/%s" style="display:inline-block;padding:14px 22px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Ver certificado</a>
              </p>
              <p style="margin:12px 0 0;font-size:14px;color:#0f172a;font-weight:600;">EcoSign. Transparencia que acompaña.</p>
            </div>
          </body></html>',
          signer_record.display_name,
          workflow_title,
          app_url,
          NEW.id
        ),
        'pending'
      );
    END LOOP;

    RAISE NOTICE 'Notificaciones de workflow completado creadas para workflow %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
