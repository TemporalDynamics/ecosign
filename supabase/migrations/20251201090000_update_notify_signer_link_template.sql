-- Actualiza la función notify_signer_link para:
-- - Evitar duplicados al mismo firmante/workflow/notification_type
-- - Usar plantilla con CTA celeste y texto extendido
-- - Mantener el link basado en access_token_hash (hash como token público)
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
      RAISE NOTICE '[notify_signer_link] saltando duplicate para % (workflow %)', NEW.email, NEW.workflow_id;
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
      '📄 Documento para firmar: ' || workflow_title,
      format(
        '<html><body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);">
            <h2 style="margin: 0 0 12px; color: #0f172a;">Tenés un documento para firmar</h2>
            <p style="margin: 0 0 12px; color: #334155;">%s te envió <strong>"%s"</strong> para revisar y firmar.</p>
            <p style="margin: 0 0 12px; color: #334155;">El flujo registra criptográficamente quién firma, qué se firmó y cuándo, para trazabilidad completa.</p>
            <a href="%s" style="display:inline-block; padding: 14px 22px; background: #0ea5e9; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; margin: 12px 0;">Ver y firmar documento</a>
            <p style="margin: 12px 0 4px; color: #64748b; font-size: 12px;">Link: %s</p>
            <p style="margin: 0; color: #64748b; font-size: 12px;">Válido hasta: %s</p>
            <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">Enlace personal e intransferible. Cada acción queda auditada.</p>
          </div>
        </body></html>',
        owner_name,
        workflow_title,
        sign_link,
        sign_link,
        expires_at_date
      ),
      'pending'
    );

    RAISE NOTICE 'Notificación creada para signer % (workflow %)', NEW.email, NEW.workflow_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
