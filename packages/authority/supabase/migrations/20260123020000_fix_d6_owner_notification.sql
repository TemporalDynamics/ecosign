-- ============================================
-- HOTFIX D6: Owner notification sin signer_id
-- ============================================
-- Problema: Ambas notificaciones (owner + signer) usaban mismo signer_id
-- Solución: Owner notification NO debe tener signer_id
-- ============================================

CREATE OR REPLACE FUNCTION notify_signature_completed()
RETURNS TRIGGER AS $$
DECLARE
  workflow_title TEXT;
  owner_email TEXT;

  -- Shadow mode variables
  v_legacy_decision BOOLEAN;
  v_canonical_decision BOOLEAN;
  v_operation TEXT;
  v_old_status TEXT;
BEGIN
  -- Determinar operación y old_status
  v_operation := TG_OP;
  v_old_status := OLD.status;

  -- ============================================
  -- LEGACY DECISION (actual, con autoridad)
  -- ============================================
  v_legacy_decision := (
    NEW.status = 'signed' AND
    (OLD.status IS NULL OR OLD.status != 'signed')
  );

  -- ============================================
  -- CANONICAL DECISION (shadow, sin autoridad)
  -- ============================================
  v_canonical_decision := should_notify_signature_completed_canonical(
    v_operation,
    v_old_status,
    NEW.status,
    NEW.id,
    NEW.workflow_id
  );

  -- ============================================
  -- SHADOW COMPARISON - ALWAYS LOG
  -- ============================================
  INSERT INTO shadow_decision_logs (
    decision_code,
    workflow_id,
    signer_id,
    legacy_decision,
    canonical_decision,
    context
  ) VALUES (
    'D6_NOTIFY_SIGNATURE_COMPLETED',
    NEW.workflow_id,
    NEW.id,
    v_legacy_decision,
    v_canonical_decision,
    jsonb_build_object(
      'operation', v_operation,
      'old_status', v_old_status,
      'new_status', NEW.status,
      'signer_email', NEW.email,
      'phase', 'PASO_2_SHADOW_MODE_D6'
    )
  );

  -- Logs para debugging
  IF v_legacy_decision != v_canonical_decision THEN
    RAISE WARNING '[SHADOW DIVERGENCE D6] legacy=% canonical=% signer=% workflow=% old_status=% new_status=%',
      v_legacy_decision, v_canonical_decision, NEW.id, NEW.workflow_id, v_old_status, NEW.status;
  ELSE
    RAISE NOTICE '[SHADOW MATCH D6] decision=% signer=% workflow=%',
      v_legacy_decision, NEW.id, NEW.workflow_id;
  END IF;

  -- ============================================
  -- EJECUTAR DECISIÓN LEGACY (autoridad actual)
  -- ============================================
  IF v_legacy_decision THEN
    -- Obtener información del workflow y owner
    SELECT
      sw.original_filename,
      u.email
    INTO workflow_title, owner_email
    FROM signature_workflows sw
    LEFT JOIN auth.users u ON u.id = sw.owner_id
    WHERE sw.id = NEW.workflow_id;

    -- ✅ FIX: Notificación 1: Al owner (SIN signer_id)
    INSERT INTO workflow_notifications (
      workflow_id,
      recipient_email,
      recipient_type,
      -- signer_id: NULL (removed) ← FIX
      notification_type,
      subject,
      body_html,
      delivery_status
    ) VALUES (
      NEW.workflow_id,
      owner_email,
      'owner',
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

    -- Notificación 2: Al signer (CON signer_id)
    INSERT INTO workflow_notifications (
      workflow_id,
      recipient_email,
      recipient_type,
      signer_id,  -- ✅ Solo la notificación al signer tiene signer_id
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

COMMENT ON FUNCTION notify_signature_completed IS
  'D6 shadow mode (FIXED): Owner notification sin signer_id para evitar duplicate key';
