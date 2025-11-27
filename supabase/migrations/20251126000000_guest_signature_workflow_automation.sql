-- ============================================
-- Migration: Automatización de Flujo de Firmas de Invitados
-- Fecha: 2025-11-26
-- ============================================
-- Este archivo implementa:
-- 1. Triggers para enviar emails automáticamente
-- 2. Funciones auxiliares para el flujo de firmas
-- ============================================

-- ============================================
-- FUNCIÓN: Enviar notificación de link de firma
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
-- TRIGGER: Al insertar un firmante
-- ============================================
DROP TRIGGER IF EXISTS on_signer_created ON workflow_signers;
CREATE TRIGGER on_signer_created
  AFTER INSERT ON workflow_signers
  FOR EACH ROW
  EXECUTE FUNCTION notify_signer_link();

-- ============================================
-- FUNCIÓN: Notificar workflow completado
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
-- TRIGGER: Al actualizar un workflow a completado
-- ============================================
DROP TRIGGER IF EXISTS on_workflow_completed ON signature_workflows;
CREATE TRIGGER on_workflow_completed
  AFTER UPDATE ON signature_workflows
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION notify_workflow_completed();

-- ============================================
-- FUNCIÓN: Notificar cuando un firmante completa su firma
-- ============================================
CREATE OR REPLACE FUNCTION notify_signature_completed()
RETURNS TRIGGER AS $$
DECLARE
  workflow_title TEXT;
  owner_email TEXT;
BEGIN
  -- Solo ejecutar si el estado cambió a 'signed'
  IF NEW.status = 'signed' AND (OLD.status IS NULL OR OLD.status != 'signed') THEN

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
-- TRIGGER: Al actualizar un firmante a 'signed'
-- ============================================
DROP TRIGGER IF EXISTS on_signature_completed ON workflow_signers;
CREATE TRIGGER on_signature_completed
  AFTER UPDATE ON workflow_signers
  FOR EACH ROW
  WHEN (NEW.status = 'signed')
  EXECUTE FUNCTION notify_signature_completed();

-- ============================================
-- AÑADIR COLUMNA FALTANTE (si no existe)
-- ============================================
-- Agregar resend_email_id a workflow_notifications si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'workflow_notifications'
    AND column_name = 'resend_email_id'
  ) THEN
    ALTER TABLE workflow_notifications ADD COLUMN resend_email_id TEXT;
    COMMENT ON COLUMN workflow_notifications.resend_email_id IS 'ID del email en Resend (para tracking)';
  END IF;
END $$;

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON FUNCTION notify_signer_link() IS 'Crea notificación de email cuando se crea un firmante';
COMMENT ON FUNCTION notify_workflow_completed() IS 'Notifica a todos cuando un workflow es completado';
COMMENT ON FUNCTION notify_signature_completed() IS 'Notifica cuando un firmante completa su firma';

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================
