-- ============================================
-- D5 Shadow Mode: Notify Signer Link
-- ============================================
-- Fase: 2 - Shadow validation
-- Objetivo: Comparar decisión canónica vs legacy sin cambiar comportamiento
-- ============================================

-- ============================================
-- 1. Tabla para logs de shadow divergencias
-- ============================================
CREATE TABLE IF NOT EXISTS shadow_decision_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Identificación de la decisión
  decision_code TEXT NOT NULL,  -- 'D5_NOTIFY_SIGNER_LINK'

  -- Contexto
  workflow_id UUID,
  signer_id UUID,

  -- Decisiones
  legacy_decision BOOLEAN NOT NULL,
  canonical_decision BOOLEAN NOT NULL,

  -- Divergencia
  has_divergence BOOLEAN GENERATED ALWAYS AS (legacy_decision != canonical_decision) STORED,

  -- Contexto adicional (JSON)
  context JSONB NOT NULL,

  -- Índices para queries
  CONSTRAINT shadow_decision_logs_check CHECK (decision_code IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_shadow_logs_decision_code
  ON shadow_decision_logs(decision_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shadow_logs_divergence
  ON shadow_decision_logs(decision_code, has_divergence, created_at DESC)
  WHERE has_divergence = true;

COMMENT ON TABLE shadow_decision_logs IS 'Logs de comparación shadow entre decisiones legacy y canónicas';
COMMENT ON COLUMN shadow_decision_logs.decision_code IS 'Código de la decisión (D1, D2, D3, etc.)';
COMMENT ON COLUMN shadow_decision_logs.has_divergence IS 'Computed: true si legacy != canonical';

-- ============================================
-- 2. Función helper: Lógica canónica en PL/pgSQL
-- ============================================
-- Esta es una COPIA temporal de la lógica TypeScript
-- Solo para shadow mode. Se eliminará en Fase 4.
-- ============================================
CREATE OR REPLACE FUNCTION should_notify_signer_link_canonical(
  p_operation TEXT,
  p_signer_status TEXT,
  p_signer_id UUID,
  p_workflow_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_previous_notification BOOLEAN;
BEGIN
  -- 1. Solo en INSERT
  IF p_operation != 'INSERT' THEN
    RETURN false;
  END IF;

  -- 2. Solo estados válidos
  IF p_signer_status NOT IN ('invited', 'ready_to_sign') THEN
    RETURN false;
  END IF;

  -- 3. Verificar si ya existe notificación (deduplicación)
  SELECT EXISTS (
    SELECT 1
    FROM workflow_notifications
    WHERE workflow_id = p_workflow_id
      AND signer_id = p_signer_id
      AND notification_type = 'your_turn_to_sign'
  ) INTO v_has_previous_notification;

  IF v_has_previous_notification THEN
    RETURN false;
  END IF;

  -- Todas las condiciones cumplidas
  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION should_notify_signer_link_canonical IS
  'D5 shadow: Lógica canónica (copia de TypeScript). TEMPORAL para shadow mode.';

-- ============================================
-- 3. Modificar trigger actual con shadow comparison
-- ============================================
CREATE OR REPLACE FUNCTION notify_signer_link()
RETURNS TRIGGER AS $$
DECLARE
  workflow_title TEXT;
  owner_name TEXT;
  owner_email TEXT;
  sign_link TEXT;
  existing_count INT;
  expires_at_date TEXT;
  display_name TEXT;

  -- Shadow mode variables
  v_legacy_decision BOOLEAN;
  v_canonical_decision BOOLEAN;
  v_operation TEXT;
BEGIN
  -- Determinar operación
  v_operation := TG_OP;

  -- ============================================
  -- LEGACY DECISION (actual, con autoridad)
  -- ============================================
  v_legacy_decision := (
    NEW.status IN ('invited', 'ready_to_sign') AND
    TG_OP = 'INSERT'
  );

  -- Verificar duplicados (parte de la decisión legacy)
  IF v_legacy_decision THEN
    SELECT COUNT(*) INTO existing_count
    FROM workflow_notifications wn
    WHERE wn.workflow_id = NEW.workflow_id
      AND wn.recipient_email = NEW.email
      AND wn.notification_type = 'your_turn_to_sign';

    IF existing_count > 0 THEN
      v_legacy_decision := false;
    END IF;
  END IF;

  -- ============================================
  -- CANONICAL DECISION (shadow, sin autoridad)
  -- ============================================
  v_canonical_decision := should_notify_signer_link_canonical(
    v_operation,
    NEW.status,
    NEW.id,
    NEW.workflow_id
  );

  -- ============================================
  -- SHADOW COMPARISON
  -- ============================================
  IF v_legacy_decision != v_canonical_decision THEN
    -- DIVERGENCIA DETECTADA
    INSERT INTO shadow_decision_logs (
      decision_code,
      workflow_id,
      signer_id,
      legacy_decision,
      canonical_decision,
      context
    ) VALUES (
      'D5_NOTIFY_SIGNER_LINK',
      NEW.workflow_id,
      NEW.id,
      v_legacy_decision,
      v_canonical_decision,
      jsonb_build_object(
        'operation', v_operation,
        'signer_status', NEW.status,
        'signer_email', NEW.email,
        'existing_count', existing_count,
        'phase', 'PASO_2_SHADOW_MODE_D5'
      )
    );

    RAISE WARNING '[SHADOW DIVERGENCE D5] legacy=% canonical=% signer=% workflow=%',
      v_legacy_decision, v_canonical_decision, NEW.id, NEW.workflow_id;
  ELSE
    -- MATCH
    RAISE NOTICE '[SHADOW MATCH D5] decision=% signer=% workflow=%',
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
      COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))
    INTO workflow_title, owner_email, owner_name
    FROM signature_workflows sw
    LEFT JOIN auth.users u ON u.id = sw.owner_id
    WHERE sw.id = NEW.workflow_id;

    -- Construir el link de firma
    sign_link := COALESCE(
      current_setting('app.frontend_url', true),
      'https://app.ecosign.app'
    ) || '/sign/' || NEW.access_token_hash;

    expires_at_date := to_char(NOW() + INTERVAL '30 days', 'DD/MM/YYYY');
    display_name := COALESCE(NEW.name, NEW.email);

    -- Insertar notificación (EFECTO PRODUCTIVO)
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

COMMENT ON FUNCTION notify_signer_link IS
  'D5 shadow mode: Trigger con comparación legacy vs canonical. Legacy mantiene autoridad.';

-- ============================================
-- 4. Vistas para monitoreo
-- ============================================

-- Vista: Resumen de shadow runs
CREATE OR REPLACE VIEW shadow_d5_summary AS
SELECT
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE has_divergence = true) as divergences,
  COUNT(*) FILTER (WHERE has_divergence = false) as matches,
  MIN(created_at) as first_run,
  MAX(created_at) as last_run,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE has_divergence = false) / NULLIF(COUNT(*), 0),
    2
  ) as match_percentage
FROM shadow_decision_logs
WHERE decision_code = 'D5_NOTIFY_SIGNER_LINK';

COMMENT ON VIEW shadow_d5_summary IS 'Resumen de comparaciones shadow para D5';

-- Vista: Últimas divergencias
CREATE OR REPLACE VIEW shadow_d5_divergences AS
SELECT
  created_at,
  workflow_id,
  signer_id,
  legacy_decision,
  canonical_decision,
  context
FROM shadow_decision_logs
WHERE decision_code = 'D5_NOTIFY_SIGNER_LINK'
  AND has_divergence = true
ORDER BY created_at DESC
LIMIT 100;

COMMENT ON VIEW shadow_d5_divergences IS 'Últimas 100 divergencias en D5 (para debugging)';

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================
