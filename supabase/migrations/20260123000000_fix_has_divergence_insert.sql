-- ============================================
-- HOTFIX: Remove explicit has_divergence insert
-- ============================================
-- Problem: has_divergence is GENERATED ALWAYS
-- Cannot insert explicit values
-- Solution: Let it calculate automatically
-- ============================================

CREATE OR REPLACE FUNCTION notify_signer_link()
RETURNS TRIGGER AS $$
DECLARE
  workflow_title TEXT;
  owner_name TEXT;
  owner_email TEXT;
  sign_link TEXT;
  existing_count INT := 0;  -- Inicializar en 0
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
    NEW.workflow_id,
    NEW.email  -- Pasar email para dedupe consistente
  );

  -- ============================================
  -- SHADOW COMPARISON - ALWAYS LOG
  -- ============================================
  -- ✅ FIX: NO insertar has_divergence explícitamente
  -- Se calcula automáticamente como GENERATED column
  INSERT INTO shadow_decision_logs (
    decision_code,
    workflow_id,
    signer_id,
    legacy_decision,
    canonical_decision,
    -- has_divergence: REMOVED - auto-calculated
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
      'phase', 'PASO_2_SHADOW_MODE_D5_FIXED'
    )
  );

  -- Logs para debugging
  IF v_legacy_decision != v_canonical_decision THEN
    RAISE WARNING '[SHADOW DIVERGENCE D5] legacy=% canonical=% signer=% workflow=% existing_count=%',
      v_legacy_decision, v_canonical_decision, NEW.id, NEW.workflow_id, existing_count;
  ELSE
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
            <p style="margin:0 0 12px;color:#475569;">%s te invitó a firmar el documento <strong>%s</strong>.</p>
            <p style="margin:0 0 24px;color:#475569;">Hacé clic en el botón de abajo para revisarlo y firmarlo.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="%s" style="background: linear-gradient(135deg, #06b6d4 0%%, #0891b2 100%%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4);">
                Ver y firmar documento
              </a>
            </div>
            <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">Este link expira el %s.</p>
            <div style="border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 24px; color: #64748b; font-size: 13px;">
              <p style="margin:0 0 12px;">Ecosign — Firma digital con valor probatorio legal</p>
              <p style="margin:0;font-size:11px;color:#94a3b8;">Este es un email automático, por favor no respondas a esta dirección.</p>
            </div>
          </div>
        </body></html>',
        display_name,
        owner_name,
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
  'D5 shadow mode (HOTFIX): has_divergence auto-calculated, not inserted';
