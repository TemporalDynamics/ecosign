-- Script de Debugging: Flujo de Firma de Guests
-- Ejecutar en Supabase SQL Editor
-- Reemplazá los valores de ejemplo con datos reales de tu test

-- ============================================================================
-- 1. VERIFICAR ESTADO DEL SIGNER (reemplazá el email)
-- ============================================================================

-- Ver estado completo del signer y su OTP
SELECT
  ws.id as signer_id,
  ws.email,
  ws.name,
  ws.status,
  ws.otp_verified as workflow_signers_otp_verified,
  ws.signed_at,
  ws.created_at as signer_created_at,
  so.otp_hash,
  so.verified_at as signer_otps_verified_at,
  so.expires_at as otp_expires_at,
  so.attempts as otp_attempts,
  ws.access_token_hash
FROM workflow_signers ws
LEFT JOIN signer_otps so ON so.signer_id = ws.id
WHERE ws.email = 'REEMPLAZAR_CON_EMAIL_DEL_GUEST@example.com'
ORDER BY ws.created_at DESC
LIMIT 1;

-- Resultado esperado:
-- - signer_id: UUID válido
-- - otp_verified (workflow_signers): TRUE después de verificar OTP
-- - verified_at (signer_otps): timestamp después de verificar OTP
-- - status: 'pending' antes de firmar, 'signed' después de firmar


-- ============================================================================
-- 2. VERIFICAR INCONSISTENCIA DE ESTADO OTP
-- ============================================================================

-- Encontrar signers donde OTP fue verificado pero workflow_signers.otp_verified es FALSE
SELECT
  ws.id,
  ws.email,
  ws.otp_verified as workflow_signers_otp_verified,
  so.verified_at as signer_otps_verified_at,
  CASE
    WHEN ws.otp_verified = false AND so.verified_at IS NOT NULL THEN '❌ INCONSISTENTE'
    WHEN ws.otp_verified = true AND so.verified_at IS NOT NULL THEN '✅ CONSISTENTE'
    WHEN ws.otp_verified = false AND so.verified_at IS NULL THEN '⏳ NO VERIFICADO'
    ELSE '❓ DESCONOCIDO'
  END as estado
FROM workflow_signers ws
LEFT JOIN signer_otps so ON so.signer_id = ws.id
WHERE ws.created_at > NOW() - INTERVAL '7 days'
ORDER BY ws.created_at DESC
LIMIT 20;

-- Si ves "❌ INCONSISTENTE": Confirmado Bug #1


-- ============================================================================
-- 3. VERIFICAR EVENTOS DEL WORKFLOW
-- ============================================================================

-- Ver todos los eventos relacionados con un signer específico
-- Reemplazá con el signer_id del paso 1
SELECT
  we.id,
  we.event_type,
  we.created_at,
  we.payload,
  we.source_event_id
FROM workflow_events we
WHERE we.signer_id = 'REEMPLAZAR_CON_SIGNER_ID'
ORDER BY we.created_at DESC;

-- Eventos esperados:
-- - otp.verified: Después de verificar OTP
-- - signer.signed: Después de aplicar firma (este falta si hay error)


-- ============================================================================
-- 4. VERIFICAR SIGNATURE_DATA
-- ============================================================================

-- Ver si el signer tiene signature_data guardada
SELECT
  id,
  email,
  status,
  signed_at,
  signature_data IS NOT NULL as tiene_signature_data,
  LENGTH(signature_data::text) as signature_data_size
FROM workflow_signers
WHERE id = 'REEMPLAZAR_CON_SIGNER_ID';

-- Resultado esperado después de firmar:
-- - tiene_signature_data: TRUE
-- - signature_data_size: > 100 (depende del tipo de firma)


-- ============================================================================
-- 5. VERIFICAR WEBHOOKS CONFIGURADOS
-- ============================================================================

-- Ver configuración de webhooks (requiere permisos de admin)
-- Ejecutar en psql o SQL Editor con service_role
SELECT
  id,
  name,
  enabled,
  events,
  config->>'table' as tabla,
  config->>'filter' as filtro,
  config->>'url' as url,
  config->>'method' as metodo
FROM supabase_functions.hooks
WHERE config->>'table' = 'workflow_events';

-- Resultado esperado:
-- - enabled: true
-- - tabla: workflow_events
-- - filtro: event_type=eq.signer.signed
-- - metodo: POST
-- - url: https://xxx.supabase.co/functions/v1/process-signer-signed


-- ============================================================================
-- 6. VERIFICAR DELIVERIES DEL WEBHOOK (últimas 10)
-- ============================================================================

-- Ver si el webhook se está disparando
-- Ejecutar en psql o SQL Editor con service_role
SELECT
  h.name as webhook_name,
  d.status_code,
  d.created_at,
  d.request_body::json->'record'->>'event_type' as event_type,
  d.response_body
FROM supabase_functions.hook_deliveries d
JOIN supabase_functions.hooks h ON h.id = d.hook_id
WHERE h.config->>'table' = 'workflow_events'
ORDER BY d.created_at DESC
LIMIT 10;

-- Resultado esperado:
-- - status_code: 200 (éxito)
-- Si ves 401: apikey incorrecta
-- Si ves 404: URL incorrecta
-- Si ves 500: Error en el Edge Function
-- Si NO ves NADA: Webhook no se está disparando


-- ============================================================================
-- 7. TEST MANUAL: Insertar evento de prueba
-- ============================================================================

-- SOLO PARA TESTING: Simular un evento signer.signed
-- CUIDADO: Esto disparará el webhook y procesará el PDF
-- Reemplazá con IDs reales de tu base de datos

/*
INSERT INTO workflow_events (workflow_id, signer_id, event_type, payload)
VALUES (
  'REEMPLAZAR_CON_WORKFLOW_ID',
  'REEMPLAZAR_CON_SIGNER_ID',
  'signer.signed',
  jsonb_build_object(
    'applied_at', NOW(),
    'identity_level', 'otp',
    'witness_pdf_hash', 'test_hash'
  )
);
*/


-- ============================================================================
-- 8. CLEANUP: Limpiar datos de prueba (opcional)
-- ============================================================================

-- Si necesitás limpiar datos de prueba de un signer específico

/*
-- Eliminar eventos
DELETE FROM workflow_events WHERE signer_id = 'REEMPLAZAR_CON_SIGNER_ID';

-- Resetear estado del signer
UPDATE workflow_signers
SET
  status = 'pending',
  signed_at = NULL,
  signature_data = NULL,
  otp_verified = FALSE
WHERE id = 'REEMPLAZAR_CON_SIGNER_ID';

-- Eliminar OTP
DELETE FROM signer_otps WHERE signer_id = 'REEMPLAZAR_CON_SIGNER_ID';
*/


-- ============================================================================
-- 9. DIAGNÓSTICO RÁPIDO: Último signer creado
-- ============================================================================

-- Ver el estado del último signer creado (útil para debugging rápido)
WITH ultimo_signer AS (
  SELECT id FROM workflow_signers ORDER BY created_at DESC LIMIT 1
)
SELECT
  ws.id,
  ws.email,
  ws.status,
  ws.otp_verified as otp_verified_en_workflow_signers,
  so.verified_at as otp_verified_en_signer_otps,
  CASE
    WHEN ws.otp_verified = false AND so.verified_at IS NOT NULL THEN '❌ BUG: OTP verificado pero no actualizado en workflow_signers'
    WHEN ws.otp_verified = true AND so.verified_at IS NOT NULL THEN '✅ OTP correctamente sincronizado'
    WHEN so.verified_at IS NULL THEN '⏳ OTP no verificado aún'
    ELSE '❓ Estado desconocido'
  END as diagnostico,
  (SELECT COUNT(*) FROM workflow_events WHERE signer_id = ws.id AND event_type = 'signer.signed') as eventos_firma,
  ws.signature_data IS NOT NULL as tiene_firma_guardada
FROM workflow_signers ws
LEFT JOIN signer_otps so ON so.signer_id = ws.id
WHERE ws.id IN (SELECT id FROM ultimo_signer);


-- ============================================================================
-- 10. VERIFICAR SIGNERS SIN EVENTO DE FIRMA
-- ============================================================================

-- Encontrar signers que tienen status='signed' pero NO tienen evento signer.signed
-- Esto indica que apply-signer-signature falló DESPUÉS de actualizar el signer
SELECT
  ws.id,
  ws.email,
  ws.status,
  ws.signed_at,
  (SELECT COUNT(*) FROM workflow_events WHERE signer_id = ws.id AND event_type = 'signer.signed') as eventos_firma
FROM workflow_signers ws
WHERE ws.status = 'signed'
  AND NOT EXISTS (
    SELECT 1 FROM workflow_events we
    WHERE we.signer_id = ws.id AND we.event_type = 'signer.signed'
  )
ORDER BY ws.signed_at DESC
LIMIT 10;

-- Si ves resultados: El webhook NO se está disparando o apply-signer-signature falló

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

-- RESUMEN DE VERIFICACIONES:
-- 1. Estado del signer: workflow_signers + signer_otps
-- 2. Inconsistencia de otp_verified
-- 3. Eventos del workflow
-- 4. Signature data guardada
-- 5. Configuración de webhooks
-- 6. Deliveries del webhook
-- 7. Test manual de evento
-- 8. Cleanup de datos de prueba
-- 9. Diagnóstico rápido del último signer
-- 10. Signers sin evento de firma
