-- Script de simulación de runs shadow para Bache 3 (D20-D22)
-- Fecha: 2026-01-24
-- Propósito: Generar datos de prueba para validar shadow mode de anchoring

-- Limpiar runs anteriores (opcional)
-- DELETE FROM shadow_decision_logs WHERE decision_code IN ('D20_RECOVER_POLYGON', 'D20_RECOVER_BITCOIN', 'D21_CONFIRM_POLYGON', 'D22_SUBMIT_BITCOIN', 'D22_CONFIRM_BITCOIN');

-- ==========================================
-- D20 - RECOVER ORPHAN ANCHORS (8 runs)
-- ==========================================

-- D20.1: Happy path - Polygon orphan reciente ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D20_RECOVER_POLYGON',
  null,
  null,
  true,
  true,
  jsonb_build_object(
    'scenario', 'polygon_orphan_recent',
    'operation', 'recover-orphan-anchors',
    'document_id', 'doc-001',
    'created_at', (now() - interval '30 minutes')::text,
    'polygon_status', 'pending',
    'has_polygon_anchor', false,
    'phase', 'PASO_2_SHADOW_MODE_D20'
  )
);

-- D20.2: Happy path - Bitcoin orphan reciente ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D20_RECOVER_BITCOIN',
  null,
  null,
  true,
  true,
  jsonb_build_object(
    'scenario', 'bitcoin_orphan_recent',
    'operation', 'recover-orphan-anchors',
    'document_id', 'doc-002',
    'created_at', (now() - interval '1 hour')::text,
    'bitcoin_status', 'pending',
    'has_bitcoin_anchor', false,
    'phase', 'PASO_2_SHADOW_MODE_D20'
  )
);

-- D20.3: Rechazo - Documento antiguo (Polygon) ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D20_RECOVER_POLYGON',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'polygon_too_old',
    'operation', 'recover-orphan-anchors',
    'document_id', 'doc-003',
    'created_at', (now() - interval '3 hours')::text,
    'polygon_status', 'pending',
    'has_polygon_anchor', false,
    'phase', 'PASO_2_SHADOW_MODE_D20'
  )
);

-- D20.4: Rechazo - Anchor ya existe (Polygon) ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D20_RECOVER_POLYGON',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'polygon_anchor_exists',
    'operation', 'recover-orphan-anchors',
    'document_id', 'doc-004',
    'created_at', (now() - interval '30 minutes')::text,
    'polygon_status', 'pending',
    'has_polygon_anchor', true,
    'phase', 'PASO_2_SHADOW_MODE_D20'
  )
);

-- D20.5: Rechazo - Status no es pending (Polygon) ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D20_RECOVER_POLYGON',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'polygon_not_pending',
    'operation', 'recover-orphan-anchors',
    'document_id', 'doc-005',
    'created_at', (now() - interval '30 minutes')::text,
    'polygon_status', 'confirmed',
    'has_polygon_anchor', false,
    'phase', 'PASO_2_SHADOW_MODE_D20'
  )
);

-- D20.6: Rechazo - Documento antiguo (Bitcoin) ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D20_RECOVER_BITCOIN',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'bitcoin_too_old',
    'operation', 'recover-orphan-anchors',
    'document_id', 'doc-006',
    'created_at', (now() - interval '4 hours')::text,
    'bitcoin_status', 'pending',
    'has_bitcoin_anchor', false,
    'phase', 'PASO_2_SHADOW_MODE_D20'
  )
);

-- D20.7: Happy path - Ambos pendientes recientes ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D20_RECOVER_POLYGON',
  null,
  null,
  true,
  true,
  jsonb_build_object(
    'scenario', 'both_pending',
    'operation', 'recover-orphan-anchors',
    'document_id', 'doc-007',
    'created_at', (now() - interval '45 minutes')::text,
    'polygon_status', 'pending',
    'bitcoin_status', 'pending',
    'has_polygon_anchor', false,
    'has_bitcoin_anchor', false,
    'phase', 'PASO_2_SHADOW_MODE_D20'
  )
);

-- D20.8: Bitcoin del mismo documento anterior ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D20_RECOVER_BITCOIN',
  null,
  null,
  true,
  true,
  jsonb_build_object(
    'scenario', 'both_pending',
    'operation', 'recover-orphan-anchors',
    'document_id', 'doc-007',
    'created_at', (now() - interval '45 minutes')::text,
    'polygon_status', 'pending',
    'bitcoin_status', 'pending',
    'has_polygon_anchor', false,
    'has_bitcoin_anchor', false,
    'phase', 'PASO_2_SHADOW_MODE_D20'
  )
);

-- ==========================================
-- D21 - CONFIRM POLYGON ANCHOR (6 runs)
-- ==========================================

-- D21.1: Happy path - Receipt confirmado ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D21_CONFIRM_POLYGON',
  null,
  null,
  true,
  true,
  jsonb_build_object(
    'scenario', 'receipt_confirmed',
    'operation', 'process-polygon-anchors',
    'anchor_id', 'anchor-001',
    'anchor_type', 'polygon',
    'polygon_tx_hash', '0xabc123',
    'receipt_status', 1,
    'block_number', 12345678,
    'polygon_attempts', 1,
    'max_attempts', 10,
    'phase', 'PASO_2_SHADOW_MODE_D21'
  )
);

-- D21.2: Happy path - Otro receipt confirmado ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D21_CONFIRM_POLYGON',
  null,
  null,
  true,
  true,
  jsonb_build_object(
    'scenario', 'receipt_confirmed_2',
    'operation', 'process-polygon-anchors',
    'anchor_id', 'anchor-002',
    'anchor_type', 'polygon',
    'polygon_tx_hash', '0xdef456',
    'receipt_status', 1,
    'block_number', 12345679,
    'polygon_attempts', 2,
    'max_attempts', 10,
    'phase', 'PASO_2_SHADOW_MODE_D21'
  )
);

-- D21.3: Rechazo - Receipt pendiente (null) ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D21_CONFIRM_POLYGON',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'receipt_pending',
    'operation', 'process-polygon-anchors',
    'anchor_id', 'anchor-003',
    'anchor_type', 'polygon',
    'polygon_tx_hash', '0xghi789',
    'receipt_status', null,
    'block_number', null,
    'polygon_attempts', 3,
    'max_attempts', 10,
    'phase', 'PASO_2_SHADOW_MODE_D21'
  )
);

-- D21.4: Rechazo - Receipt fallido (status=0) ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D21_CONFIRM_POLYGON',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'receipt_failed',
    'operation', 'process-polygon-anchors',
    'anchor_id', 'anchor-004',
    'anchor_type', 'polygon',
    'polygon_tx_hash', '0xjkl012',
    'receipt_status', 0,
    'block_number', 12345680,
    'polygon_attempts', 1,
    'max_attempts', 10,
    'phase', 'PASO_2_SHADOW_MODE_D21'
  )
);

-- D21.5: Rechazo - Max attempts superado ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D21_CONFIRM_POLYGON',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'max_attempts_exceeded',
    'operation', 'process-polygon-anchors',
    'anchor_id', 'anchor-005',
    'anchor_type', 'polygon',
    'polygon_tx_hash', '0xmno345',
    'receipt_status', 1,
    'block_number', 12345681,
    'polygon_attempts', 11,
    'max_attempts', 10,
    'phase', 'PASO_2_SHADOW_MODE_D21'
  )
);

-- D21.6: Rechazo - Sin tx_hash ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D21_CONFIRM_POLYGON',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'no_tx_hash',
    'operation', 'process-polygon-anchors',
    'anchor_id', 'anchor-006',
    'anchor_type', 'polygon',
    'polygon_tx_hash', null,
    'receipt_status', null,
    'block_number', null,
    'polygon_attempts', 1,
    'max_attempts', 10,
    'phase', 'PASO_2_SHADOW_MODE_D21'
  )
);

-- ==========================================
-- D22 - BITCOIN ANCHORS (8 runs)
-- ==========================================

-- D22.1: Submit - Happy path queued ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D22_SUBMIT_BITCOIN',
  null,
  null,
  true,
  true,
  jsonb_build_object(
    'scenario', 'submit_queued',
    'operation', 'process-bitcoin-anchors',
    'anchor_id', 'btc-anchor-001',
    'anchor_status', 'queued',
    'phase', 'PASO_2_SHADOW_MODE_D22'
  )
);

-- D22.2: Submit - Happy path otro queued ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D22_SUBMIT_BITCOIN',
  null,
  null,
  true,
  true,
  jsonb_build_object(
    'scenario', 'submit_queued_2',
    'operation', 'process-bitcoin-anchors',
    'anchor_id', 'btc-anchor-002',
    'anchor_status', 'queued',
    'phase', 'PASO_2_SHADOW_MODE_D22'
  )
);

-- D22.3: Submit - Rechazo pending (ya fue submitted) ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D22_SUBMIT_BITCOIN',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'already_submitted',
    'operation', 'process-bitcoin-anchors',
    'anchor_id', 'btc-anchor-003',
    'anchor_status', 'pending',
    'phase', 'PASO_2_SHADOW_MODE_D22'
  )
);

-- D22.4: Confirm - Happy path confirmado con upgraded proof ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D22_CONFIRM_BITCOIN',
  null,
  null,
  true,
  true,
  jsonb_build_object(
    'scenario', 'confirmed_upgraded',
    'operation', 'process-bitcoin-anchors',
    'anchor_id', 'btc-anchor-004',
    'anchor_status', 'pending',
    'verification_confirmed', true,
    'verification_txid', 'btc-tx-123',
    'verification_block_height', 800000,
    'verification_upgraded', true,
    'bitcoin_status', 'pending',
    'bitcoin_attempts', 10,
    'max_attempts', 288,
    'phase', 'PASO_2_SHADOW_MODE_D22'
  )
);

-- D22.5: Confirm - Happy path confirmado con txid ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D22_CONFIRM_BITCOIN',
  null,
  null,
  true,
  true,
  jsonb_build_object(
    'scenario', 'confirmed_txid',
    'operation', 'process-bitcoin-anchors',
    'anchor_id', 'btc-anchor-005',
    'anchor_status', 'pending',
    'verification_confirmed', true,
    'verification_txid', 'btc-tx-456',
    'verification_block_height', 800001,
    'verification_upgraded', false,
    'bitcoin_status', 'pending',
    'bitcoin_attempts', 50,
    'max_attempts', 288,
    'phase', 'PASO_2_SHADOW_MODE_D22'
  )
);

-- D22.6: Confirm - Rechazo cancelado por usuario ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D22_CONFIRM_BITCOIN',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'user_cancelled',
    'operation', 'process-bitcoin-anchors',
    'anchor_id', 'btc-anchor-006',
    'anchor_status', 'pending',
    'verification_confirmed', true,
    'bitcoin_status', 'cancelled',
    'bitcoin_attempts', 20,
    'max_attempts', 288,
    'phase', 'PASO_2_SHADOW_MODE_D22'
  )
);

-- D22.7: Confirm - Rechazo verification no confirmada ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D22_CONFIRM_BITCOIN',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'verification_not_confirmed',
    'operation', 'process-bitcoin-anchors',
    'anchor_id', 'btc-anchor-007',
    'anchor_status', 'pending',
    'verification_confirmed', false,
    'bitcoin_status', 'pending',
    'bitcoin_attempts', 100,
    'max_attempts', 288,
    'phase', 'PASO_2_SHADOW_MODE_D22'
  )
);

-- D22.8: Confirm - Rechazo timeout (max attempts) ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D22_CONFIRM_BITCOIN',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'timeout',
    'operation', 'process-bitcoin-anchors',
    'anchor_id', 'btc-anchor-008',
    'anchor_status', 'pending',
    'verification_confirmed', true,
    'verification_txid', 'btc-tx-789',
    'bitcoin_status', 'pending',
    'bitcoin_attempts', 289,
    'max_attempts', 288,
    'phase', 'PASO_2_SHADOW_MODE_D22'
  )
);

-- ==========================================
-- RESUMEN
-- ==========================================

SELECT
  '✅ Simulación completada' as status,
  (SELECT COUNT(*) FROM shadow_decision_logs WHERE decision_code = 'D20_RECOVER_POLYGON') as d20_polygon_runs,
  (SELECT COUNT(*) FROM shadow_decision_logs WHERE decision_code = 'D20_RECOVER_BITCOIN') as d20_bitcoin_runs,
  (SELECT COUNT(*) FROM shadow_decision_logs WHERE decision_code = 'D21_CONFIRM_POLYGON') as d21_runs,
  (SELECT COUNT(*) FROM shadow_decision_logs WHERE decision_code = 'D22_SUBMIT_BITCOIN') as d22_submit_runs,
  (SELECT COUNT(*) FROM shadow_decision_logs WHERE decision_code = 'D22_CONFIRM_BITCOIN') as d22_confirm_runs,
  (SELECT COUNT(*) FROM shadow_decision_logs WHERE decision_code IN ('D20_RECOVER_POLYGON', 'D20_RECOVER_BITCOIN', 'D21_CONFIRM_POLYGON', 'D22_SUBMIT_BITCOIN', 'D22_CONFIRM_BITCOIN')) as total_runs;
