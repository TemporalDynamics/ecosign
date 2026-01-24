-- ============================================
-- D8 Shadow Mode: Notify Creator Detailed
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
CREATE OR REPLACE FUNCTION should_notify_creator_detailed_canonical(
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

COMMENT ON FUNCTION should_notify_creator_detailed_canonical IS
  'D8 shadow: Lógica canónica (copia de TypeScript). TEMPORAL para shadow mode.';

-- ============================================
-- 2. Modificar trigger actual con shadow comparison
-- ============================================
CREATE OR REPLACE FUNCTION notify_creator_on_signature()
RETURNS TRIGGER AS $$
DECLARE
  workflow_title TEXT;
  owner_email TEXT;
  owner_name TEXT;
  current_hash TEXT;

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
  v_canonical_decision := should_notify_creator_detailed_canonical(
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
    'D8_NOTIFY_CREATOR_DETAILED',
    NEW.workflow_id,
    NEW.id,
    v_legacy_decision,
    v_canonical_decision,
    jsonb_build_object(
      'operation', v_operation,
      'old_status', v_old_status,
      'new_status', NEW.status,
      'signer_email', NEW.email,
      'phase', 'PASO_2_SHADOW_MODE_D8'
    )
  );

  -- Logs para debugging
  IF v_legacy_decision != v_canonical_decision THEN
    RAISE WARNING '[SHADOW DIVERGENCE D8] legacy=% canonical=% signer=% workflow=% old_status=% new_status=%',
      v_legacy_decision, v_canonical_decision, NEW.id, NEW.workflow_id, v_old_status, NEW.status;
  ELSE
    RAISE NOTICE '[SHADOW MATCH D8] decision=% signer=% workflow=%',
      v_legacy_decision, NEW.id, NEW.workflow_id;
  END IF;

  -- ============================================
  -- EJECUTAR DECISIÓN LEGACY (autoridad actual)
  -- ============================================
  IF v_legacy_decision THEN
    -- Obtener información del workflow y owner
    SELECT
      sw.original_filename,
      u.email,
      COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
      sw.document_hash
    INTO workflow_title, owner_email, owner_name, current_hash
    FROM signature_workflows sw
    LEFT JOIN auth.users u ON u.id = sw.owner_id
    WHERE sw.id = NEW.workflow_id;

    -- Insertar notificación adicional para el creador
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
      'creator_detailed_notification',
      '🔔 Nueva Firma Recibida: ' || COALESCE(NEW.name, 'Usuario') || ' firmó ' || workflow_title,
      format(
        '<html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #111827;">Nueva Firma Registrada</h1>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0;">Detalles de la Firma</h2>
            <p><strong>Firmante:</strong> %s (%s)</p>
            <p><strong>Documento:</strong> %s</p>
            <p><strong>Fecha y Hora:</strong> %s</p>
            <p><strong>Smart Hash:</strong> <code style="background: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">%s</code></p>
          </div>

          <div style="margin: 30px 0;">
            <p>Esta firma ha sido registrada con evidencia forense completa en el sistema ECOX.</p>
            <p>Puedes verificar el estado completo del documento en tu dashboard.</p>
          </div>

          <a href="https://app.ecosign.app/dashboard/workflows/%s"
             style="display: inline-block; background-color: #111827; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Ver Detalles del Workflow
          </a>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
            <p>Este es un email automático del sistema EcoSign.</p>
            <p>La certeza forense de esta firma está respaldada por el registro ECOX completo.</p>
          </div>
        </body>
        </html>',
        COALESCE(NEW.name, 'Usuario sin nombre'),
        NEW.email,
        workflow_title,
        to_char(NOW(), 'DD/MM/YYYY HH24:MI:SS UTC'),
        COALESCE(current_hash, 'Pendiente de cálculo'),
        NEW.workflow_id
      ),
      'pending'
    );

    RAISE NOTICE 'Notificación detallada para creador enviada: workflow % - firmante %', NEW.workflow_id, NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_creator_on_signature IS
  'D8 shadow mode: Trigger con comparación legacy vs canonical. Legacy mantiene autoridad.';

-- ============================================
-- 3. Vistas para monitoreo D8
-- ============================================

-- Vista: Resumen de shadow runs D8
CREATE OR REPLACE VIEW shadow_d8_summary AS
SELECT
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE has_divergence = true) as divergences,
  COUNT(*) FILTER (WHERE has_divergence = false) as matches,
  MIN(created_at) as first_run,
  MAX(created_at) as last_run,
  ROUND(100.0 * COUNT(*) FILTER (WHERE has_divergence = false) / NULLIF(COUNT(*), 0), 2) as match_percentage
FROM shadow_decision_logs
WHERE decision_code = 'D8_NOTIFY_CREATOR_DETAILED';

COMMENT ON VIEW shadow_d8_summary IS 'D8: Resumen de comparaciones shadow para notify_creator_on_signature';

-- Vista: Últimas divergencias D8
CREATE OR REPLACE VIEW shadow_d8_divergences AS
SELECT
  created_at,
  workflow_id,
  signer_id,
  legacy_decision,
  canonical_decision,
  context
FROM shadow_decision_logs
WHERE decision_code = 'D8_NOTIFY_CREATOR_DETAILED'
  AND has_divergence = true
ORDER BY created_at DESC
LIMIT 100;

COMMENT ON VIEW shadow_d8_divergences IS 'D8: Últimas 100 divergencias detectadas en notify_creator_on_signature';

-- ============================================
-- 4. Verificación de integridad
-- ============================================
SELECT * FROM shadow_d8_summary LIMIT 0;
SELECT * FROM shadow_d8_divergences LIMIT 0;
