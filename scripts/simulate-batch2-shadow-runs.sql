-- Script de simulación de runs shadow para Bache 2 (D16-D19)
-- Fecha: 2026-01-24
-- Propósito: Generar datos de prueba para validar shadow mode de aceptación de NDA

-- Limpiar runs anteriores (opcional)
-- DELETE FROM shadow_decision_logs WHERE decision_code IN ('D16_ACCEPT_NDA', 'D17_ACCEPT_WORKFLOW_NDA', 'D18_ACCEPT_INVITE_NDA', 'D19_ACCEPT_SHARE_NDA');

-- ==========================================
-- D16 - ACCEPT NDA (6 runs)
-- ==========================================

-- D16.1: Happy path - link válido, recipient exists, sin NDA previo ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D16_ACCEPT_NDA',
  null,
  null,
  true,
  true,
  jsonb_build_object(
    'scenario', 'happy_path',
    'operation', 'accept-nda',
    'link_id', 'link-001',
    'recipient_id', 'recipient-001',
    'has_existing_acceptance', false,
    'phase', 'PASO_2_SHADOW_MODE_D16'
  )
);

-- D16.2: Happy path - otro link válido ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D16_ACCEPT_NDA',
  null,
  null,
  true,
  true,
  jsonb_build_object(
    'scenario', 'happy_path_2',
    'operation', 'accept-nda',
    'link_id', 'link-002',
    'recipient_id', 'recipient-002',
    'has_existing_acceptance', false,
    'phase', 'PASO_2_SHADOW_MODE_D16'
  )
);

-- D16.3: Rechazo - ya tiene NDA aceptado (idempotente) ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D16_ACCEPT_NDA',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'already_accepted',
    'operation', 'accept-nda',
    'link_id', 'link-003',
    'recipient_id', 'recipient-003',
    'has_existing_acceptance', true,
    'phase', 'PASO_2_SHADOW_MODE_D16'
  )
);

-- D16.4: Rechazo - link sin recipient_id ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D16_ACCEPT_NDA',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'no_recipient',
    'operation', 'accept-nda',
    'link_id', 'link-004',
    'recipient_id', null,
    'has_existing_acceptance', false,
    'phase', 'PASO_2_SHADOW_MODE_D16'
  )
);

-- D16.5: Rechazo - link inválido ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D16_ACCEPT_NDA',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'invalid_link',
    'operation', 'accept-nda',
    'link_id', null,
    'recipient_id', null,
    'has_existing_acceptance', false,
    'phase', 'PASO_2_SHADOW_MODE_D16'
  )
);

-- D16.6: Rechazo - recipient no existe ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D16_ACCEPT_NDA',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'recipient_not_found',
    'operation', 'accept-nda',
    'link_id', 'link-005',
    'recipient_id', null,
    'has_existing_acceptance', false,
    'phase', 'PASO_2_SHADOW_MODE_D16'
  )
);

-- ==========================================
-- D17 - ACCEPT WORKFLOW NDA (5 runs)
-- ==========================================

-- D17.1: Happy path - email coincide, NDA no aceptado ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D17_ACCEPT_WORKFLOW_NDA',
  null,
  gen_random_uuid(),
  true,
  true,
  jsonb_build_object(
    'scenario', 'happy_path',
    'operation', 'accept-workflow-nda',
    'signer_id', 'signer-101',
    'email_matches', true,
    'nda_accepted', false,
    'phase', 'PASO_2_SHADOW_MODE_D17'
  )
);

-- D17.2: Happy path - otro signer válido ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D17_ACCEPT_WORKFLOW_NDA',
  null,
  gen_random_uuid(),
  true,
  true,
  jsonb_build_object(
    'scenario', 'happy_path_2',
    'operation', 'accept-workflow-nda',
    'signer_id', 'signer-102',
    'email_matches', true,
    'nda_accepted', false,
    'phase', 'PASO_2_SHADOW_MODE_D17'
  )
);

-- D17.3: Rechazo - email no coincide ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D17_ACCEPT_WORKFLOW_NDA',
  null,
  gen_random_uuid(),
  false,
  false,
  jsonb_build_object(
    'scenario', 'email_mismatch',
    'operation', 'accept-workflow-nda',
    'signer_id', 'signer-103',
    'email_matches', false,
    'nda_accepted', false,
    'phase', 'PASO_2_SHADOW_MODE_D17'
  )
);

-- D17.4: Rechazo - NDA ya aceptado ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D17_ACCEPT_WORKFLOW_NDA',
  null,
  gen_random_uuid(),
  false,
  false,
  jsonb_build_object(
    'scenario', 'already_accepted',
    'operation', 'accept-workflow-nda',
    'signer_id', 'signer-104',
    'email_matches', true,
    'nda_accepted', true,
    'phase', 'PASO_2_SHADOW_MODE_D17'
  )
);

-- D17.5: Rechazo - email mismatch + ya aceptado ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D17_ACCEPT_WORKFLOW_NDA',
  null,
  gen_random_uuid(),
  false,
  false,
  jsonb_build_object(
    'scenario', 'email_mismatch_and_accepted',
    'operation', 'accept-workflow-nda',
    'signer_id', 'signer-105',
    'email_matches', false,
    'nda_accepted', true,
    'phase', 'PASO_2_SHADOW_MODE_D17'
  )
);

-- ==========================================
-- D18 - ACCEPT INVITE NDA (6 runs)
-- ==========================================

-- D18.1: Happy path - invite válido, no expirado, no revocado, no aceptado ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D18_ACCEPT_INVITE_NDA',
  null,
  null,
  true,
  true,
  jsonb_build_object(
    'scenario', 'happy_path',
    'operation', 'accept-invite-nda',
    'invite_id', 'invite-001',
    'expires_at', (now() + interval '7 days')::text,
    'revoked_at', null,
    'nda_accepted_at', null,
    'phase', 'PASO_2_SHADOW_MODE_D18'
  )
);

-- D18.2: Happy path - otro invite válido ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D18_ACCEPT_INVITE_NDA',
  null,
  null,
  true,
  true,
  jsonb_build_object(
    'scenario', 'happy_path_2',
    'operation', 'accept-invite-nda',
    'invite_id', 'invite-002',
    'expires_at', (now() + interval '30 days')::text,
    'revoked_at', null,
    'nda_accepted_at', null,
    'phase', 'PASO_2_SHADOW_MODE_D18'
  )
);

-- D18.3: Rechazo - invite expirado ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D18_ACCEPT_INVITE_NDA',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'expired',
    'operation', 'accept-invite-nda',
    'invite_id', 'invite-003',
    'expires_at', (now() - interval '1 day')::text,
    'revoked_at', null,
    'nda_accepted_at', null,
    'phase', 'PASO_2_SHADOW_MODE_D18'
  )
);

-- D18.4: Rechazo - invite revocado ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D18_ACCEPT_INVITE_NDA',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'revoked',
    'operation', 'accept-invite-nda',
    'invite_id', 'invite-004',
    'expires_at', (now() + interval '7 days')::text,
    'revoked_at', (now() - interval '1 hour')::text,
    'nda_accepted_at', null,
    'phase', 'PASO_2_SHADOW_MODE_D18'
  )
);

-- D18.5: Rechazo - NDA ya aceptado ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D18_ACCEPT_INVITE_NDA',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'already_accepted',
    'operation', 'accept-invite-nda',
    'invite_id', 'invite-005',
    'expires_at', (now() + interval '7 days')::text,
    'revoked_at', null,
    'nda_accepted_at', (now() - interval '2 hours')::text,
    'phase', 'PASO_2_SHADOW_MODE_D18'
  )
);

-- D18.6: Rechazo - múltiples problemas ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D18_ACCEPT_INVITE_NDA',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'multiple_issues',
    'operation', 'accept-invite-nda',
    'invite_id', 'invite-006',
    'expires_at', (now() - interval '1 day')::text,
    'revoked_at', (now() - interval '2 days')::text,
    'nda_accepted_at', (now() - interval '3 days')::text,
    'phase', 'PASO_2_SHADOW_MODE_D18'
  )
);

-- ==========================================
-- D19 - ACCEPT SHARE NDA (5 runs)
-- ==========================================

-- D19.1: Happy path - email coincide, NDA enabled, no aceptado ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D19_ACCEPT_SHARE_NDA',
  null,
  null,
  true,
  true,
  jsonb_build_object(
    'scenario', 'happy_path',
    'operation', 'accept-share-nda',
    'share_id', 'share-001',
    'nda_enabled', true,
    'nda_accepted_at', null,
    'email_matches', true,
    'phase', 'PASO_2_SHADOW_MODE_D19'
  )
);

-- D19.2: Happy path - otro share válido ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D19_ACCEPT_SHARE_NDA',
  null,
  null,
  true,
  true,
  jsonb_build_object(
    'scenario', 'happy_path_2',
    'operation', 'accept-share-nda',
    'share_id', 'share-002',
    'nda_enabled', true,
    'nda_accepted_at', null,
    'email_matches', true,
    'phase', 'PASO_2_SHADOW_MODE_D19'
  )
);

-- D19.3: Rechazo - email no coincide ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D19_ACCEPT_SHARE_NDA',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'email_mismatch',
    'operation', 'accept-share-nda',
    'share_id', 'share-003',
    'nda_enabled', true,
    'nda_accepted_at', null,
    'email_matches', false,
    'phase', 'PASO_2_SHADOW_MODE_D19'
  )
);

-- D19.4: Rechazo - NDA no habilitado ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D19_ACCEPT_SHARE_NDA',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'nda_not_enabled',
    'operation', 'accept-share-nda',
    'share_id', 'share-004',
    'nda_enabled', false,
    'nda_accepted_at', null,
    'email_matches', true,
    'phase', 'PASO_2_SHADOW_MODE_D19'
  )
);

-- D19.5: Rechazo - NDA ya aceptado ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D19_ACCEPT_SHARE_NDA',
  null,
  null,
  false,
  false,
  jsonb_build_object(
    'scenario', 'already_accepted',
    'operation', 'accept-share-nda',
    'share_id', 'share-005',
    'nda_enabled', true,
    'nda_accepted_at', (now() - interval '1 hour')::text,
    'email_matches', true,
    'phase', 'PASO_2_SHADOW_MODE_D19'
  )
);

-- ==========================================
-- RESUMEN
-- ==========================================

SELECT
  '✅ Simulación completada' as status,
  (SELECT COUNT(*) FROM shadow_decision_logs WHERE decision_code = 'D16_ACCEPT_NDA') as d16_runs,
  (SELECT COUNT(*) FROM shadow_decision_logs WHERE decision_code = 'D17_ACCEPT_WORKFLOW_NDA') as d17_runs,
  (SELECT COUNT(*) FROM shadow_decision_logs WHERE decision_code = 'D18_ACCEPT_INVITE_NDA') as d18_runs,
  (SELECT COUNT(*) FROM shadow_decision_logs WHERE decision_code = 'D19_ACCEPT_SHARE_NDA') as d19_runs,
  (SELECT COUNT(*) FROM shadow_decision_logs WHERE decision_code IN ('D16_ACCEPT_NDA', 'D17_ACCEPT_WORKFLOW_NDA', 'D18_ACCEPT_INVITE_NDA', 'D19_ACCEPT_SHARE_NDA')) as total_runs;
