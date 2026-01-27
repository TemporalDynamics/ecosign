-- ============================================
-- Migration: Update signature workflow triggers with feature flags
-- Fecha: 2026-01-26
-- Descripción: Actualiza los triggers de workflow para usar feature flags que controlan autoridad canónica
-- ============================================

-- ============================================
-- FUNCIÓN ACTUALIZADA: notify_signer_link con checks de flags
-- ============================================
CREATE OR REPLACE FUNCTION notify_signer_link()
RETURNS TRIGGER AS $$
DECLARE
  workflow_title TEXT;
  owner_name TEXT;
  owner_email TEXT;
  sign_link TEXT;
  expires_at_date TEXT;
BEGIN
  -- Solo enviar si el firmante acaba de ser creado y está en estado 'pending' o 'ready'
  IF NEW.status IN ('pending', 'ready') AND TG_OP = 'INSERT' THEN

    -- Check if D5 (notifications) decision is under canonical authority
    -- If so, this trigger should not execute (executor handles it)
    IF public.is_decision_under_canonical_authority('D5_NOTIFICATIONS_ENABLED') THEN
      RAISE NOTICE 'Notification trigger: D5 under canonical authority, skipping direct notifications for signer % (workflow %)', NEW.email, NEW.workflow_id;
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

    -- Construir el link de firma (ajustar según tu frontend)
    sign_link := COALESCE(
      current_setting('app.frontend_url', true),
      'https://app.ecosign.app'
    ) || '/sign/' || NEW.access_token_hash;

    -- Fecha de expiración (30 días desde ahora por defecto)
    expires_at_date := (NOW() + INTERVAL '30 days')::TEXT;

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
      -- Usar un template HTML simple por ahora
      format(
        '<html><body><h2>Tenés un documento para firmar</h2><p>%s te envió el documento <strong>"%s"</strong> para que lo revises y firmes.</p><p><a href="%s" style="background-color: #111827; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block;">Revisar y firmar documento</a></p><p>Link: %s</p><p>Válido hasta: %s</p></body></html>',
        owner_name,
        workflow_title,
        sign_link,
        sign_link,
        to_char(NOW() + INTERVAL '30 days', 'DD/MM/YYYY')
      ),
      'pending'
    );

    RAISE NOTICE 'Notificación creada para signer % (workflow %)', NEW.email, NEW.workflow_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN ACTUALIZADA: notify_workflow_completed con checks de flags
-- ============================================
CREATE OR REPLACE FUNCTION notify_workflow_completed()
RETURNS TRIGGER AS $$
DECLARE
  signer_record RECORD;
  workflow_title TEXT;
  eco_file_download_url TEXT;
BEGIN
  -- Solo ejecutar si el estado cambió a 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Check if D5 (notifications) decision is under canonical authority
    -- If so, this trigger should not execute (executor handles it)
    IF public.is_decision_under_canonical_authority('D5_NOTIFICATIONS_ENABLED') THEN
      RAISE NOTICE 'Notification trigger: D5 under canonical authority, skipping direct notifications for workflow %', NEW.id;
      RETURN NEW;
    END IF;

    workflow_title := NEW.original_filename;

    -- URL de descarga del .ECO (ajustar según tu implementación)
    eco_file_download_url := COALESCE(
      current_setting('app.frontend_url', true),
      'https://app.ecosign.app'
    ) || '/download/' || NEW.id || '/eco';

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
      '✅ Documento firmado completamente: ' || workflow_title,
      format(
        '<html><body><h2>¡Tu documento está completado!</h2><p>El documento <strong>"%s"</strong> fue firmado por todos los participantes.</p><p><a href="%s" style="background-color: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block;">Descargar certificado .ECO</a></p><p>Link de descarga: %s</p></body></html>',
        workflow_title,
        eco_file_download_url,
        eco_file_download_url
      ),
      'pending'
    FROM auth.users u
    WHERE u.id = NEW.owner_id;

    -- Notificar a todos los firmantes
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
        subject,
        body_html,
        delivery_status
      ) VALUES (
        NEW.id,
        signer_record.email,
        'signer',
        'workflow_completed',
        '✅ Documento completado: ' || workflow_title,
        format(
          '<html><body><h2>Documento completado</h2><p>El documento <strong>"%s"</strong> que firmaste está ahora completado por todos los participantes.</p><p><a href="%s" style="background-color: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block;">Ver certificado .ECO</a></p><p>Link: %s</p></body></html>',
          workflow_title,
          eco_file_download_url,
          eco_file_download_url
        ),
        'pending'
      );
    END LOOP;

    RAISE NOTICE 'Notificaciones de workflow completado creadas para workflow %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN ACTUALIZADA: notify_signature_completed con checks de flags
-- ============================================
CREATE OR REPLACE FUNCTION notify_signature_completed()
RETURNS TRIGGER AS $$
DECLARE
  workflow_title TEXT;
  owner_email TEXT;
BEGIN
  -- Solo ejecutar si el estado cambió a 'signed'
  IF NEW.status = 'signed' AND (OLD.status IS NULL OR OLD.status != 'signed') THEN

    -- Check if D5 (notifications) decision is under canonical authority
    -- If so, this trigger should not execute (executor handles it)
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

    -- Notificar al owner que alguien firmó
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
    );

    -- Notificar al firmante que su firma fue exitosa
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
    );

    RAISE NOTICE 'Notificaciones de firma completada creadas para signer % (workflow %)', NEW.email, NEW.workflow_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICACIÓN
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Funciones de notificación actualizadas con checks de feature flags';
  RAISE NOTICE 'Ahora verifican: is_decision_under_canonical_authority(''D5_NOTIFICATIONS_ENABLED'')';
END $$;