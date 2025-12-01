-- Plantilla HTML para acceso vencido y reenvío (firmante) y reenvío owner

-- Función para enviar acceso vencido (si se usa)
CREATE OR REPLACE FUNCTION notify_link_expired(p_notification_id uuid)
RETURNS void AS $$
DECLARE
  notif RECORD;
  app_url TEXT;
BEGIN
  SELECT * INTO notif FROM workflow_notifications WHERE id = p_notification_id;
  IF NOT FOUND THEN
    RAISE NOTICE 'notification % not found', p_notification_id;
    RETURN;
  END IF;

  app_url := COALESCE(current_setting('app.frontend_url', true), 'https://app.ecosign.app');

  UPDATE workflow_notifications
  SET body_html = format(
    '<html><body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);">
        <p style="margin:0 0 8px;font-size:14px;color:#0f172a;">Hola %s,</p>
        <p style="margin:0 0 12px;font-size:16px;color:#0f172a;font-weight:bold;">El acceso para firmar %s venció.</p>
        <p style="margin:0 0 12px;font-size:14px;color:#334155;">El remitente puede enviarte un nuevo enlace si corresponde.</p>
        <p style="margin:12px 0 0;font-size:14px;color:#0f172a;font-weight:600;">EcoSign. Transparencia que acompaña.</p>
      </div>
    </body></html>',
    COALESCE(notif.recipient_name, notif.recipient_email),
    notif.subject
  )
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Función para reenvío (firmante)
CREATE OR REPLACE FUNCTION notify_resend_access(p_notification_id uuid)
RETURNS void AS $$
DECLARE
  notif RECORD;
  app_url TEXT;
BEGIN
  SELECT * INTO notif FROM workflow_notifications WHERE id = p_notification_id;
  IF NOT FOUND THEN
    RAISE NOTICE 'notification % not found', p_notification_id;
    RETURN;
  END IF;

  app_url := COALESCE(current_setting('app.frontend_url', true), 'https://app.ecosign.app');

  UPDATE workflow_notifications
  SET body_html = format(
    '<html><body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);">
        <p style="margin:0 0 8px;font-size:14px;color:#0f172a;">Hola %s,</p>
        <p style="margin:0 0 12px;font-size:16px;color:#0f172a;font-weight:bold;">Se renovó tu acceso para firmar:</p>
        <p style="margin:0 0 16px;font-size:15px;color:#0f172a;"><strong>%s</strong></p>
        <p style="margin:0 0 16px;font-size:14px;color:#334155;">Tu firma quedará protegida con evidencia verificable.</p>
        <p style="margin:16px 0;">
          <a href="%s" style="display:inline-block;padding:14px 22px;background:#0ea5e9;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">Ver y Firmar Documento</a>
        </p>
        <p style="margin:0 0 12px;font-size:12px;color:#94a3b8;">Link válido hasta: %s</p>
        <p style="margin:16px 0 0;font-size:14px;color:#0f172a;font-weight:600;">EcoSign. Transparencia que acompaña.</p>
        <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">Este enlace es personal e intransferible. Todas las acciones quedan registradas por seguridad.</p>
      </div>
    </body></html>',
    COALESCE(notif.recipient_name, notif.recipient_email),
    notif.subject,
    notif.body_html, -- reuse sign_url if stored; alternatively store in metadata
    to_char(NOW() + INTERVAL '30 days', 'DD/MM/YYYY')
  )
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Función para reenvío owner (nuevo acceso)
CREATE OR REPLACE FUNCTION notify_owner_resend(p_notification_id uuid)
RETURNS void AS $$
DECLARE
  notif RECORD;
  app_url TEXT;
BEGIN
  SELECT * INTO notif FROM workflow_notifications WHERE id = p_notification_id;
  IF NOT FOUND THEN
    RAISE NOTICE 'notification % not found', p_notification_id;
    RETURN;
  END IF;

  app_url := COALESCE(current_setting('app.frontend_url', true), 'https://app.ecosign.app');

  UPDATE workflow_notifications
  SET body_html = format(
    '<html><body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);">
        <p style="margin:0 0 8px;font-size:14px;color:#0f172a;">Hola,</p>
        <p style="margin:0 0 12px;font-size:16px;color:#0f172a;font-weight:bold;">Se envió un nuevo acceso al firmante.</p>
        <p style="margin:0 0 16px;font-size:15px;color:#0f172a;"><strong>%s</strong></p>
        <p style="margin:0 0 16px;font-size:14px;color:#334155;">Podés ver el estado en tu dashboard.</p>
        <p style="margin:16px 0;">
          <a href="%s/dashboard" style="display:inline-block;padding:14px 22px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Ver estado del flujo</a>
        </p>
        <p style="margin:16px 0 0;font-size:14px;color:#0f172a;font-weight:600;">EcoSign. Transparencia que acompaña.</p>
      </div>
    </body></html>',
    notif.subject,
    app_url
  )
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql;
