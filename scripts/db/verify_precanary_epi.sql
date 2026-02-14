-- Verificación de invariantes EPI pre-canary
-- Este script verifica que los invariantes fundamentales estén correctamente implementados

-- 1. Verificar que workflows completados estén enlazados a witness signed/*
-- Debe devolver 0 filas si todos los workflows completados tienen witness canónico inmutable.
SELECT 
    sw.id AS workflow_id,
    sw.document_entity_id,
    de.witness_current_storage_path
FROM signature_workflows sw
LEFT JOIN document_entities de ON de.id = sw.document_entity_id
WHERE sw.status = 'completed'
    AND (sw.document_entity_id IS NULL
         OR de.witness_current_storage_path IS NULL
         OR de.witness_current_storage_path = ''
         OR de.witness_current_storage_path NOT LIKE 'signed/%');

-- 2. Verificar que no existan workflow.completed sin documento signed/ asociado
-- Debe devolver 0 filas si todos los workflows completados tienen documentos firmados válidos
SELECT 
    we.workflow_id
FROM workflow_events we
JOIN signature_workflows sw ON sw.id = we.workflow_id
LEFT JOIN document_entities de ON de.id = sw.document_entity_id
WHERE we.event_type = 'workflow.completed'
    AND (sw.document_entity_id IS NULL
         OR de.witness_current_storage_path IS NULL 
         OR de.witness_current_storage_path = ''
         OR de.witness_current_storage_path NOT LIKE 'signed/%');

-- 3. Verificar que no existan entradas duplicadas en workflow_notifications para el mismo workflow/signer/notification_type/step
-- Debe devolver 0 filas si la idempotencia está correctamente implementada
SELECT 
    workflow_id, 
    signer_id, 
    notification_type, 
    step,
    COUNT(*) as duplicates
FROM workflow_notifications
GROUP BY workflow_id, signer_id, notification_type, step
HAVING COUNT(*) > 1;

-- 4. Verificar que todo witness signed/* tenga al menos una fila asociada en user_documents
-- Debe devolver 0 filas si el artefacto canónico firmado puede resolverse para preview/share.
SELECT 
    de.id,
    de.witness_current_storage_path
FROM document_entities
de
WHERE de.witness_current_storage_path LIKE 'signed/%'
    AND NOT EXISTS (
        SELECT 1
        FROM user_documents ud
        WHERE ud.document_entity_id = de.id
    );

-- 5. Verificar que no existan entradas en user_documents con rutas signed/ huérfanas en document_entities
-- Debe devolver 0 filas si la relación entre tablas es consistente
SELECT 
    ud.id,
    COALESCE(ud.pdf_storage_path, ud.encrypted_path) AS storage_path
FROM user_documents ud
WHERE COALESCE(ud.pdf_storage_path, ud.encrypted_path) LIKE 'signed/%'
    AND NOT EXISTS (
        SELECT 1 
        FROM document_entities de 
        WHERE de.witness_current_storage_path = COALESCE(ud.pdf_storage_path, ud.encrypted_path)
    );
