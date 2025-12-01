-- Actualiza la plantilla de invitación al firmante con tono premium y cierre unificado
CREATE OR REPLACE FUNCTION notify_signer_link()
RETURNS TRIGGER AS $$
DECLARE
  workflow_title TEXT;
  owner_name TEXT;
  owner_email TEXT;
  sign_link TEXT;
  existing_count INT;
  expires_at_date TEXT;
BEGIN
  IF NEW.status IN ('pending', 'ready') AND TG_OP = 'INSERT' THEN
    -- Evitar duplicados si ya existe una notificación para este firmante/workflow
    SELECT COUNT(*) INTO existing_count
    FROM workflow_notifications wn
    WHERE wn.workflow_id = NEW.workflow_id
      AND wn.recipient_email = NEW.email
      AND wn.notification_type = 'your_turn_to_sign';

    IF existing_count > 0 THEN
      RAISE NOTICE '[notify_signer_link] skipping duplicate for % (workflow %)', NEW.email, NEW.workflow_id;
      RETURN NEW;
    END IF;

    -- Obtener información del workflow y owner
    SELECT
      sw.original_filename,
      u.email,
      COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))
    INTO workflow_title, owner_email, owner_name
    FROM signature_workflows sw
    LEFT JOIN auth.users u ON u.id = sw.owner_id
    WHERE sw.id = NEW.workflow_id;

    -- Construir el link de firma con el hash como token público
    sign_link := COALESCE(
      current_setting('app.frontend_url', true),
      'https://app.ecosign.app'
    ) || '/sign/' || NEW.access_token_hash;

    -- Fecha de expiración (30 días desde ahora por defecto)
    expires_at_date := to_char(NOW() + INTERVAL '30 days', 'DD/MM/YYYY');

    -- Nombre a mostrar
    DECLARE display_name TEXT;
    BEGIN
      display_name := COALESCE(NEW.name, NEW.email);
    END;

    -- Insertar notificación en la cola
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
      'your_turn_to_sign',
      'Tenés un documento para firmar — ' || workflow_title,
      format(
        '<html><body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);">
            <p style="margin:0 0 12px;color:#0f172a;">Hola %s,</p>
            <p style="margin:0 0 12px;color:#334155;">Te enviaron un documento para firmar:</p>
            <p style="margin:0 0 16px;font-weight:600;color:#0f172a;">%s</p>
            <p style="margin:0 0 16px;color:#334155;">EcoSign certifica tu firma con trazabilidad completa y te entrega una copia segura, para que siempre tengas tu propia evidencia.</p>
            <p style="margin:16px 0;">
              <a href="%s" style="display:inline-block;padding:14px 22px;background:#0ea5e9;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">Ver y Firmar Documento</a>
            </p>
            <p style="margin:0 0 12px;color:#64748b;font-size:12px;">Link válido hasta: %s</p>
            <p style="margin:16px 0 0;color:#0f172a;font-weight:600;">EcoSign. Transparencia que acompaña.</p>
            <p style="margin:8px 0 0;color:#94a3b8;font-size:12px;">Este enlace es personal e intransferible. Todas las acciones quedan registradas por seguridad.</p>
          </div>
        </body></html>',
        display_name,
        workflow_title,
        sign_link,
        expires_at_date
      ),
      'pending'
    );

    RAISE NOTICE 'Notification created for signer % (workflow %)', NEW.email, NEW.workflow_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
