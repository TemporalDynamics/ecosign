-- ============================================
-- D7 Shadow Mode: Notify Workflow Completed
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
CREATE OR REPLACE FUNCTION should_notify_workflow_completed_canonical(
  p_operation TEXT,
  p_old_status TEXT,
  p_new_status TEXT,
  p_workflow_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- 1. Solo en UPDATE
  IF p_operation != 'UPDATE' THEN
    RETURN false;
  END IF;

  -- 2. Solo si el estado nuevo es 'completed'
  IF p_new_status != 'completed' THEN
    RETURN false;
  END IF;

  -- 3. Solo si el estado anterior NO era 'completed' (evita duplicados)
  IF p_old_status = 'completed' THEN
    RETURN false;
  END IF;

  -- Todas las condiciones cumplidas
  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION should_notify_workflow_completed_canonical IS
  'D7 shadow: Lógica canónica (copia de TypeScript). TEMPORAL para shadow mode.';

-- ============================================
-- 2. Modificar trigger actual con shadow comparison
-- ============================================
CREATE OR REPLACE FUNCTION notify_workflow_completed()
RETURNS TRIGGER AS $$
DECLARE
  signer_record RECORD;
  workflow_title TEXT;
  eco_file_download_url TEXT;

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
    NEW.status = 'completed' AND
    (OLD.status IS NULL OR OLD.status != 'completed')
  );

  -- ============================================
  -- CANONICAL DECISION (shadow, sin autoridad)
  -- ============================================
  v_canonical_decision := should_notify_workflow_completed_canonical(
    v_operation,
    v_old_status,
    NEW.status,
    NEW.id
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
    'D7_NOTIFY_WORKFLOW_COMPLETED',
    NEW.id,
    NULL,
    v_legacy_decision,
    v_canonical_decision,
    jsonb_build_object(
      'operation', v_operation,
      'old_status', v_old_status,
      'new_status', NEW.status,
      'owner_id', NEW.owner_id,
      'phase', 'PASO_2_SHADOW_MODE_D7'
    )
  );

  -- Logs para debugging
  IF v_legacy_decision != v_canonical_decision THEN
    RAISE WARNING '[SHADOW DIVERGENCE D7] legacy=% canonical=% workflow=% old_status=% new_status=%',
      v_legacy_decision, v_canonical_decision, NEW.id, v_old_status, NEW.status;
  ELSE
    RAISE NOTICE '[SHADOW MATCH D7] decision=% workflow=%',
      v_legacy_decision, NEW.id;
  END IF;

  -- ============================================
  -- EJECUTAR DECISIÓN LEGACY (autoridad actual)
  -- ============================================
  IF v_legacy_decision THEN
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

    -- Notificar a todos los firmantes (solo signed)
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

COMMENT ON FUNCTION notify_workflow_completed IS
  'D7 shadow mode: Trigger con comparación legacy vs canonical. Legacy mantiene autoridad.';

-- ============================================
-- 3. Vistas para monitoreo D7
-- ============================================

-- Vista: Resumen de shadow runs D7
CREATE OR REPLACE VIEW shadow_d7_summary AS
SELECT
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE has_divergence = true) as divergences,
  COUNT(*) FILTER (WHERE has_divergence = false) as matches,
  MIN(created_at) as first_run,
  MAX(created_at) as last_run,
  ROUND(100.0 * COUNT(*) FILTER (WHERE has_divergence = false) / NULLIF(COUNT(*), 0), 2) as match_percentage
FROM shadow_decision_logs
WHERE decision_code = 'D7_NOTIFY_WORKFLOW_COMPLETED';

COMMENT ON VIEW shadow_d7_summary IS 'D7: Resumen de comparaciones shadow para notify_workflow_completed';

-- Vista: Últimas divergencias D7
CREATE OR REPLACE VIEW shadow_d7_divergences AS
SELECT
  created_at,
  workflow_id,
  signer_id,
  legacy_decision,
  canonical_decision,
  context
FROM shadow_decision_logs
WHERE decision_code = 'D7_NOTIFY_WORKFLOW_COMPLETED'
  AND has_divergence = true
ORDER BY created_at DESC
LIMIT 100;

COMMENT ON VIEW shadow_d7_divergences IS 'D7: Últimas 100 divergencias detectadas en notify_workflow_completed';

-- ============================================
-- 4. Verificación de integridad
-- ============================================
SELECT * FROM shadow_d7_summary LIMIT 0;
SELECT * FROM shadow_d7_divergences LIMIT 0;
