-- Script de simulación de runs shadow para Bache 1 (D12-D15)
-- Fecha: 2026-01-24
-- Propósito: Generar datos de prueba para validar shadow mode sin usuarios reales

-- Limpiar runs anteriores (opcional)
-- DELETE FROM shadow_decision_logs WHERE decision_code IN ('D12_APPLY_SIGNER_SIGNATURE', 'D13_START_SIGNATURE_WORKFLOW', 'D14_REQUEST_DOCUMENT_CHANGES', 'D15_RESPOND_TO_CHANGES');

-- ==========================================
-- D12 - APPLY SIGNER SIGNATURE (7 runs)
-- ==========================================

-- D12.1: Happy path - signerId, ready_to_sign, otp_verified ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D12_APPLY_SIGNER_SIGNATURE',
  gen_random_uuid(),
  gen_random_uuid(),
  true,
  true,
  jsonb_build_object(
    'scenario', 'happy_path_signer_id',
    'signer', jsonb_build_object(
      'id', 'signer-001',
      'workflow_id', 'workflow-001',
      'status', 'ready_to_sign',
      'token_expires_at', (now() + interval '1 day')::text,
      'token_revoked_at', null,
      'otp_verified', true
    ),
    'payload', jsonb_build_object(
      'signerId', 'signer-001',
      'workflowId', 'workflow-001'
    )
  )
);

-- D12.2: Happy path - accessToken ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D12_APPLY_SIGNER_SIGNATURE',
  gen_random_uuid(),
  gen_random_uuid(),
  true,
  true,
  jsonb_build_object(
    'scenario', 'happy_path_access_token',
    'signer', jsonb_build_object(
      'id', 'signer-002',
      'workflow_id', 'workflow-002',
      'status', 'ready_to_sign',
      'token_expires_at', (now() + interval '1 day')::text,
      'token_revoked_at', null,
      'otp_verified', true
    ),
    'payload', jsonb_build_object(
      'accessToken', 'token-abc-123'
    )
  )
);

-- D12.3: Rechazo - falta signerId y accessToken ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D12_APPLY_SIGNER_SIGNATURE',
  gen_random_uuid(),
  gen_random_uuid(),
  false,
  false,
  jsonb_build_object(
    'scenario', 'missing_auth',
    'signer', jsonb_build_object(
      'id', 'signer-003',
      'workflow_id', 'workflow-003',
      'status', 'ready_to_sign',
      'token_expires_at', (now() + interval '1 day')::text,
      'token_revoked_at', null,
      'otp_verified', true
    ),
    'payload', jsonb_build_object()
  )
);

-- D12.4: Rechazo - OTP no verificado ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D12_APPLY_SIGNER_SIGNATURE',
  gen_random_uuid(),
  gen_random_uuid(),
  false,
  false,
  jsonb_build_object(
    'scenario', 'otp_not_verified',
    'signer', jsonb_build_object(
      'id', 'signer-004',
      'workflow_id', 'workflow-004',
      'status', 'ready_to_sign',
      'token_expires_at', (now() + interval '1 day')::text,
      'token_revoked_at', null,
      'otp_verified', false
    ),
    'payload', jsonb_build_object(
      'signerId', 'signer-004',
      'workflowId', 'workflow-004'
    )
  )
);

-- D12.5: Rechazo - Token revocado ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D12_APPLY_SIGNER_SIGNATURE',
  gen_random_uuid(),
  gen_random_uuid(),
  false,
  false,
  jsonb_build_object(
    'scenario', 'token_revoked',
    'signer', jsonb_build_object(
      'id', 'signer-005',
      'workflow_id', 'workflow-005',
      'status', 'ready_to_sign',
      'token_expires_at', (now() + interval '1 day')::text,
      'token_revoked_at', (now() - interval '1 hour')::text,
      'otp_verified', true
    ),
    'payload', jsonb_build_object(
      'signerId', 'signer-005',
      'workflowId', 'workflow-005'
    )
  )
);

-- D12.6: Rechazo - Signer ya firmó ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D12_APPLY_SIGNER_SIGNATURE',
  gen_random_uuid(),
  gen_random_uuid(),
  false,
  false,
  jsonb_build_object(
    'scenario', 'already_signed',
    'signer', jsonb_build_object(
      'id', 'signer-006',
      'workflow_id', 'workflow-006',
      'status', 'signed',
      'token_expires_at', (now() + interval '1 day')::text,
      'token_revoked_at', null,
      'otp_verified', true
    ),
    'payload', jsonb_build_object(
      'signerId', 'signer-006',
      'workflowId', 'workflow-006'
    )
  )
);

-- D12.7: Aceptado - Caso edge: sin token_expires_at ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D12_APPLY_SIGNER_SIGNATURE',
  gen_random_uuid(),
  gen_random_uuid(),
  true,
  true,
  jsonb_build_object(
    'scenario', 'no_expiration',
    'signer', jsonb_build_object(
      'id', 'signer-007',
      'workflow_id', 'workflow-007',
      'status', 'ready_to_sign',
      'token_expires_at', null,
      'token_revoked_at', null,
      'otp_verified', true
    ),
    'payload', jsonb_build_object(
      'signerId', 'signer-007',
      'workflowId', 'workflow-007'
    )
  )
);

-- ==========================================
-- D13 - START SIGNATURE WORKFLOW (6 runs)
-- ==========================================

-- D13.1: Happy path - workflow completo ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, legacy_decision, canonical_decision, context)
VALUES (
  'D13_START_SIGNATURE_WORKFLOW',
  gen_random_uuid(),
  true,
  true,
  jsonb_build_object(
    'scenario', 'happy_path',
    'actor_id', 'user-001',
    'payload', jsonb_build_object(
      'documentUrl', 'https://storage.example.com/doc.pdf',
      'documentHash', 'hash-abc-123',
      'originalFilename', 'contract.pdf',
      'signers', jsonb_build_array(
        jsonb_build_object('email', 'signer1@example.com', 'signingOrder', 1),
        jsonb_build_object('email', 'signer2@example.com', 'signingOrder', 2)
      ),
      'forensicConfig', jsonb_build_object(
        'rfc3161', true,
        'polygon', false,
        'bitcoin', false
      ),
      'deliveryMode', 'email'
    )
  )
);

-- D13.2: Happy path - 3 signers con delivery link ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, legacy_decision, canonical_decision, context)
VALUES (
  'D13_START_SIGNATURE_WORKFLOW',
  gen_random_uuid(),
  true,
  true,
  jsonb_build_object(
    'scenario', 'multiple_signers_link_delivery',
    'actor_id', 'user-002',
    'payload', jsonb_build_object(
      'documentUrl', 'https://storage.example.com/doc2.pdf',
      'documentHash', 'hash-def-456',
      'originalFilename', 'agreement.pdf',
      'signers', jsonb_build_array(
        jsonb_build_object('email', 'a@example.com', 'signingOrder', 1),
        jsonb_build_object('email', 'b@example.com', 'signingOrder', 2),
        jsonb_build_object('email', 'c@example.com', 'signingOrder', 3)
      ),
      'forensicConfig', jsonb_build_object(
        'rfc3161', true,
        'polygon', true,
        'bitcoin', true
      ),
      'deliveryMode', 'link'
    )
  )
);

-- D13.3: Rechazo - falta documentUrl ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, legacy_decision, canonical_decision, context)
VALUES (
  'D13_START_SIGNATURE_WORKFLOW',
  gen_random_uuid(),
  false,
  false,
  jsonb_build_object(
    'scenario', 'missing_document_url',
    'actor_id', 'user-003',
    'payload', jsonb_build_object(
      'documentHash', 'hash-ghi-789',
      'originalFilename', 'contract.pdf',
      'signers', jsonb_build_array(
        jsonb_build_object('email', 'signer@example.com', 'signingOrder', 1)
      ),
      'forensicConfig', jsonb_build_object(
        'rfc3161', true,
        'polygon', false,
        'bitcoin', false
      )
    )
  )
);

-- D13.4: Rechazo - sin signers ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, legacy_decision, canonical_decision, context)
VALUES (
  'D13_START_SIGNATURE_WORKFLOW',
  gen_random_uuid(),
  false,
  false,
  jsonb_build_object(
    'scenario', 'no_signers',
    'actor_id', 'user-004',
    'payload', jsonb_build_object(
      'documentUrl', 'https://storage.example.com/doc3.pdf',
      'documentHash', 'hash-jkl-012',
      'originalFilename', 'document.pdf',
      'signers', jsonb_build_array(),
      'forensicConfig', jsonb_build_object(
        'rfc3161', true,
        'polygon', false,
        'bitcoin', false
      )
    )
  )
);

-- D13.5: Rechazo - signingOrder incorrecto (no empieza en 1) ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, legacy_decision, canonical_decision, context)
VALUES (
  'D13_START_SIGNATURE_WORKFLOW',
  gen_random_uuid(),
  false,
  false,
  jsonb_build_object(
    'scenario', 'invalid_signing_order',
    'actor_id', 'user-005',
    'payload', jsonb_build_object(
      'documentUrl', 'https://storage.example.com/doc4.pdf',
      'documentHash', 'hash-mno-345',
      'originalFilename', 'file.pdf',
      'signers', jsonb_build_array(
        jsonb_build_object('email', 'a@example.com', 'signingOrder', 2),
        jsonb_build_object('email', 'b@example.com', 'signingOrder', 3)
      ),
      'forensicConfig', jsonb_build_object(
        'rfc3161', true,
        'polygon', false,
        'bitcoin', false
      )
    )
  )
);

-- D13.6: Rechazo - sin actor_id ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, legacy_decision, canonical_decision, context)
VALUES (
  'D13_START_SIGNATURE_WORKFLOW',
  gen_random_uuid(),
  false,
  false,
  jsonb_build_object(
    'scenario', 'missing_actor_id',
    'actor_id', null,
    'payload', jsonb_build_object(
      'documentUrl', 'https://storage.example.com/doc5.pdf',
      'documentHash', 'hash-pqr-678',
      'originalFilename', 'contract.pdf',
      'signers', jsonb_build_array(
        jsonb_build_object('email', 'signer@example.com', 'signingOrder', 1)
      ),
      'forensicConfig', jsonb_build_object(
        'rfc3161', true,
        'polygon', false,
        'bitcoin', false
      )
    )
  )
);

-- ==========================================
-- D14 - REQUEST DOCUMENT CHANGES (5 runs)
-- ==========================================

-- D14.1: Happy path - signer puede solicitar cambios ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D14_REQUEST_DOCUMENT_CHANGES',
  gen_random_uuid(),
  gen_random_uuid(),
  true,
  true,
  jsonb_build_object(
    'scenario', 'happy_path',
    'signer', jsonb_build_object(
      'id', 'signer-101',
      'status', 'ready_to_sign',
      'change_request_status', null
    ),
    'workflow', jsonb_build_object(
      'status', 'active'
    ),
    'payload', jsonb_build_object(
      'accessToken', 'token-xyz-789',
      'annotations', jsonb_build_array(
        jsonb_build_object('page', 1, 'text', 'Please change this'),
        jsonb_build_object('page', 2, 'text', 'Update this section')
      )
    )
  )
);

-- D14.2: Happy path - múltiples anotaciones ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D14_REQUEST_DOCUMENT_CHANGES',
  gen_random_uuid(),
  gen_random_uuid(),
  true,
  true,
  jsonb_build_object(
    'scenario', 'multiple_annotations',
    'signer', jsonb_build_object(
      'id', 'signer-102',
      'status', 'ready_to_sign',
      'change_request_status', null
    ),
    'workflow', jsonb_build_object(
      'status', 'partially_signed'
    ),
    'payload', jsonb_build_object(
      'accessToken', 'token-abc-456',
      'annotations', jsonb_build_array(
        jsonb_build_object('page', 1, 'text', 'Fix typo'),
        jsonb_build_object('page', 3, 'text', 'Add clarification'),
        jsonb_build_object('page', 5, 'text', 'Update date')
      )
    )
  )
);

-- D14.3: Rechazo - sin accessToken ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D14_REQUEST_DOCUMENT_CHANGES',
  gen_random_uuid(),
  gen_random_uuid(),
  false,
  false,
  jsonb_build_object(
    'scenario', 'missing_access_token',
    'signer', jsonb_build_object(
      'id', 'signer-103',
      'status', 'ready_to_sign',
      'change_request_status', null
    ),
    'workflow', jsonb_build_object(
      'status', 'active'
    ),
    'payload', jsonb_build_object(
      'annotations', jsonb_build_array(
        jsonb_build_object('page', 1, 'text', 'Change needed')
      )
    )
  )
);

-- D14.4: Rechazo - workflow completado ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D14_REQUEST_DOCUMENT_CHANGES',
  gen_random_uuid(),
  gen_random_uuid(),
  false,
  false,
  jsonb_build_object(
    'scenario', 'workflow_completed',
    'signer', jsonb_build_object(
      'id', 'signer-104',
      'status', 'ready_to_sign',
      'change_request_status', null
    ),
    'workflow', jsonb_build_object(
      'status', 'completed'
    ),
    'payload', jsonb_build_object(
      'accessToken', 'token-def-789',
      'annotations', jsonb_build_array(
        jsonb_build_object('page', 1, 'text', 'Too late')
      )
    )
  )
);

-- D14.5: Rechazo - ya tiene solicitud pendiente ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D14_REQUEST_DOCUMENT_CHANGES',
  gen_random_uuid(),
  gen_random_uuid(),
  false,
  false,
  jsonb_build_object(
    'scenario', 'already_has_pending_request',
    'signer', jsonb_build_object(
      'id', 'signer-105',
      'status', 'ready_to_sign',
      'change_request_status', 'pending'
    ),
    'workflow', jsonb_build_object(
      'status', 'active'
    ),
    'payload', jsonb_build_object(
      'accessToken', 'token-ghi-012',
      'annotations', jsonb_build_array(
        jsonb_build_object('page', 1, 'text', 'Another change')
      )
    )
  )
);

-- ==========================================
-- D15 - RESPOND TO CHANGES (6 runs)
-- ==========================================

-- D15.1: Happy path - accept con nuevo documento ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D15_RESPOND_TO_CHANGES',
  gen_random_uuid(),
  gen_random_uuid(),
  true,
  true,
  jsonb_build_object(
    'scenario', 'accept_with_new_doc',
    'actor_id', 'owner-001',
    'workflow', jsonb_build_object(
      'id', 'workflow-201',
      'owner_id', 'owner-001',
      'status', 'active'
    ),
    'signer', jsonb_build_object(
      'id', 'signer-201',
      'workflow_id', 'workflow-201',
      'change_request_status', 'pending'
    ),
    'payload', jsonb_build_object(
      'workflowId', 'workflow-201',
      'signerId', 'signer-201',
      'action', 'accept',
      'newDocumentUrl', 'https://storage.example.com/updated-doc.pdf',
      'newDocumentHash', 'hash-new-001'
    )
  )
);

-- D15.2: Happy path - reject sin nuevo documento ✅
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D15_RESPOND_TO_CHANGES',
  gen_random_uuid(),
  gen_random_uuid(),
  true,
  true,
  jsonb_build_object(
    'scenario', 'reject_without_new_doc',
    'actor_id', 'owner-002',
    'workflow', jsonb_build_object(
      'id', 'workflow-202',
      'owner_id', 'owner-002',
      'status', 'active'
    ),
    'signer', jsonb_build_object(
      'id', 'signer-202',
      'workflow_id', 'workflow-202',
      'change_request_status', 'pending'
    ),
    'payload', jsonb_build_object(
      'workflowId', 'workflow-202',
      'signerId', 'signer-202',
      'action', 'reject'
    )
  )
);

-- D15.3: Rechazo - sin actor_id ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D15_RESPOND_TO_CHANGES',
  gen_random_uuid(),
  gen_random_uuid(),
  false,
  false,
  jsonb_build_object(
    'scenario', 'missing_actor_id',
    'actor_id', null,
    'workflow', jsonb_build_object(
      'id', 'workflow-203',
      'owner_id', 'owner-003',
      'status', 'active'
    ),
    'signer', jsonb_build_object(
      'id', 'signer-203',
      'workflow_id', 'workflow-203',
      'change_request_status', 'pending'
    ),
    'payload', jsonb_build_object(
      'workflowId', 'workflow-203',
      'signerId', 'signer-203',
      'action', 'reject'
    )
  )
);

-- D15.4: Rechazo - actor no es owner ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D15_RESPOND_TO_CHANGES',
  gen_random_uuid(),
  gen_random_uuid(),
  false,
  false,
  jsonb_build_object(
    'scenario', 'actor_not_owner',
    'actor_id', 'user-999',
    'workflow', jsonb_build_object(
      'id', 'workflow-204',
      'owner_id', 'owner-004',
      'status', 'active'
    ),
    'signer', jsonb_build_object(
      'id', 'signer-204',
      'workflow_id', 'workflow-204',
      'change_request_status', 'pending'
    ),
    'payload', jsonb_build_object(
      'workflowId', 'workflow-204',
      'signerId', 'signer-204',
      'action', 'accept',
      'newDocumentUrl', 'https://storage.example.com/hacked.pdf',
      'newDocumentHash', 'hash-bad-001'
    )
  )
);

-- D15.5: Rechazo - no hay change_request pendiente ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D15_RESPOND_TO_CHANGES',
  gen_random_uuid(),
  gen_random_uuid(),
  false,
  false,
  jsonb_build_object(
    'scenario', 'no_pending_request',
    'actor_id', 'owner-005',
    'workflow', jsonb_build_object(
      'id', 'workflow-205',
      'owner_id', 'owner-005',
      'status', 'active'
    ),
    'signer', jsonb_build_object(
      'id', 'signer-205',
      'workflow_id', 'workflow-205',
      'change_request_status', null
    ),
    'payload', jsonb_build_object(
      'workflowId', 'workflow-205',
      'signerId', 'signer-205',
      'action', 'accept',
      'newDocumentUrl', 'https://storage.example.com/new.pdf',
      'newDocumentHash', 'hash-new-002'
    )
  )
);

-- D15.6: Rechazo - accept sin nuevo documento ❌
INSERT INTO shadow_decision_logs (decision_code, workflow_id, signer_id, legacy_decision, canonical_decision, context)
VALUES (
  'D15_RESPOND_TO_CHANGES',
  gen_random_uuid(),
  gen_random_uuid(),
  false,
  false,
  jsonb_build_object(
    'scenario', 'accept_without_new_doc',
    'actor_id', 'owner-006',
    'workflow', jsonb_build_object(
      'id', 'workflow-206',
      'owner_id', 'owner-006',
      'status', 'active'
    ),
    'signer', jsonb_build_object(
      'id', 'signer-206',
      'workflow_id', 'workflow-206',
      'change_request_status', 'pending'
    ),
    'payload', jsonb_build_object(
      'workflowId', 'workflow-206',
      'signerId', 'signer-206',
      'action', 'accept'
    )
  )
);

-- ==========================================
-- RESUMEN
-- ==========================================

SELECT
  '✅ Simulación completada' as status,
  (SELECT COUNT(*) FROM shadow_decision_logs WHERE decision_code = 'D12_APPLY_SIGNER_SIGNATURE') as d12_runs,
  (SELECT COUNT(*) FROM shadow_decision_logs WHERE decision_code = 'D13_START_SIGNATURE_WORKFLOW') as d13_runs,
  (SELECT COUNT(*) FROM shadow_decision_logs WHERE decision_code = 'D14_REQUEST_DOCUMENT_CHANGES') as d14_runs,
  (SELECT COUNT(*) FROM shadow_decision_logs WHERE decision_code = 'D15_RESPOND_TO_CHANGES') as d15_runs,
  (SELECT COUNT(*) FROM shadow_decision_logs WHERE decision_code IN ('D12_APPLY_SIGNER_SIGNATURE', 'D13_START_SIGNATURE_WORKFLOW', 'D14_REQUEST_DOCUMENT_CHANGES', 'D15_RESPOND_TO_CHANGES')) as total_runs;
