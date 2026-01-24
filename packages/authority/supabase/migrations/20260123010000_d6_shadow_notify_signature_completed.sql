-- ============================================
-- D6 Shadow Mode: Notify Signature Completed
-- ============================================
-- Fase: 2 - Shadow validation
-- Objetivo: Comparar decisión canónica vs legacy sin cambiar comportamiento
-- ============================================

-- ============================================
-- 1. Función helper: Lógica canónica en PL/pgSQL
-- ============================================
-- Esta es una COPIA temporal de la lógica TypeScript
-- Solo para shadow mode. Se eliminará en Fase 4.
-- ============================================
CREATE OR REPLACE FUNCTION should_notify_signature_completed_canonical(
  p_operation TEXT,
  p_old_status TEXT,
  p_new_status TEXT,
  p_signer_id UUID,
  p_workflow_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- 1. Solo en UPDATE
  IF p_operation != 'UPDATE' THEN
    RETURN false;
  END IF;

  -- 2. Solo si el estado nuevo es 'signed'
  IF p_new_status != 'signed' THEN
    RETURN false;
  END IF;

  -- 3. Solo si el estado anterior NO era 'signed' (evita duplicados)
  IF p_old_status = 'signed' THEN
    RETURN false;
  END IF;

  -- Todas las condiciones cumplidas
  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION should_notify_signature_completed_canonical IS
  'D6 shadow: Lógica canónica (copia de TypeScript). TEMPORAL para shadow mode.';

-- ============================================
-- 2. Modificar trigger actual con shadow comparison
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
    -- has_divergence auto-calculated
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

    -- Notificación 1: Al owner (alguien firmó tu documento)
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

    -- Notificación 2: Al signer (tu firma fue registrada)
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

COMMENT ON FUNCTION notify_signature_completed IS
  'D6 shadow mode: Trigger con comparación legacy vs canonical. Legacy mantiene autoridad.';

-- ============================================
-- 3. Vistas para monitoreo D6
-- ============================================

-- Vista: Resumen de shadow runs D6
CREATE OR REPLACE VIEW shadow_d6_summary AS
SELECT
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE has_divergence = true) as divergences,
  COUNT(*) FILTER (WHERE has_divergence = false) as matches,
  MIN(created_at) as first_run,
  MAX(created_at) as last_run,
  ROUND(100.0 * COUNT(*) FILTER (WHERE has_divergence = false) / NULLIF(COUNT(*), 0), 2) as match_percentage
FROM shadow_decision_logs
WHERE decision_code = 'D6_NOTIFY_SIGNATURE_COMPLETED';

COMMENT ON VIEW shadow_d6_summary IS 'D6: Resumen de comparaciones shadow para notify_signature_completed';

-- Vista: Últimas divergencias D6
CREATE OR REPLACE VIEW shadow_d6_divergences AS
SELECT
  created_at,
  workflow_id,
  signer_id,
  legacy_decision,
  canonical_decision,
  context
FROM shadow_decision_logs
WHERE decision_code = 'D6_NOTIFY_SIGNATURE_COMPLETED'
  AND has_divergence = true
ORDER BY created_at DESC
LIMIT 100;

COMMENT ON VIEW shadow_d6_divergences IS 'D6: Últimas 100 divergencias detectadas en notify_signature_completed';

-- ============================================
-- 4. Verificación de integridad
-- ============================================
SELECT * FROM shadow_d6_summary LIMIT 0;
SELECT * FROM shadow_d6_divergences LIMIT 0;
