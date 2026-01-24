/**
 * D6 - Decisión: ¿Notificar completación de firma?
 *
 * Decisión canónica pura que determina si se deben encolar notificaciones
 * cuando un signer completa su firma (transición a status = 'signed').
 *
 * Diferencia con D5:
 * - D5: 1 notificación en INSERT (signer)
 * - D6: 2 notificaciones en UPDATE (owner + signer)
 *
 * @module decisions/notifySignatureCompleted
 * @phase Fase 2 - Shadow mode
 * @see docs/migration/D6_NOTIFY_SIGNATURE_COMPLETED.md
 */

export interface NotifySignatureCompletedInput {
  operation: 'INSERT' | 'UPDATE';
  old_status: string | null;
  new_status: string;
  signer_id: string;
  workflow_id: string;
}

/**
 * Decide si se deben encolar notificaciones cuando un signer completa su firma.
 *
 * Regla canónica:
 * - Solo en UPDATE
 * - Solo si NEW.status = 'signed'
 * - Solo si OLD.status != 'signed' (evita duplicados)
 *
 * Side effects (NO ejecutados por esta función):
 * - INSERT workflow_notifications (recipient = owner, type = signature_completed)
 * - INSERT workflow_notifications (recipient = signer, type = signature_completed)
 *
 * @param input - Parámetros de la decisión
 * @returns true si se deben encolar las 2 notificaciones, false en caso contrario
 */
export function shouldNotifySignatureCompleted(
  input: NotifySignatureCompletedInput
): boolean {
  // 1. Solo en UPDATE
  if (input.operation !== 'UPDATE') {
    return false;
  }

  // 2. Solo si el estado nuevo es 'signed'
  if (input.new_status !== 'signed') {
    return false;
  }

  // 3. Solo si el estado anterior NO era 'signed' (evita duplicados)
  // Nota: old_status puede ser null en casos edge (no debería pasar en UPDATE normal)
  if (input.old_status === 'signed') {
    return false;
  }

  // Todas las condiciones cumplidas → Encolar 2 notificaciones
  return true;
}

/**
 * Tests integrados (para validación rápida)
 */
export const tests = {
  'UPDATE ready_to_sign → signed': () => {
    const result = shouldNotifySignatureCompleted({
      operation: 'UPDATE',
      old_status: 'ready_to_sign',
      new_status: 'signed',
      signer_id: 'uuid-1',
      workflow_id: 'uuid-w1',
    });
    console.assert(result === true, 'Debe notificar en transición a signed');
  },

  'UPDATE invited → signed': () => {
    const result = shouldNotifySignatureCompleted({
      operation: 'UPDATE',
      old_status: 'invited',
      new_status: 'signed',
      signer_id: 'uuid-1',
      workflow_id: 'uuid-w1',
    });
    console.assert(result === true, 'Debe notificar desde invited');
  },

  'UPDATE signed → signed (duplicado)': () => {
    const result = shouldNotifySignatureCompleted({
      operation: 'UPDATE',
      old_status: 'signed',
      new_status: 'signed',
      signer_id: 'uuid-1',
      workflow_id: 'uuid-w1',
    });
    console.assert(result === false, 'No debe re-notificar si ya estaba signed');
  },

  'UPDATE invited → ready_to_sign (no signed)': () => {
    const result = shouldNotifySignatureCompleted({
      operation: 'UPDATE',
      old_status: 'invited',
      new_status: 'ready_to_sign',
      signer_id: 'uuid-1',
      workflow_id: 'uuid-w1',
    });
    console.assert(result === false, 'No debe notificar si no llegó a signed');
  },

  'INSERT con status signed': () => {
    const result = shouldNotifySignatureCompleted({
      operation: 'INSERT',
      old_status: null,
      new_status: 'signed',
      signer_id: 'uuid-1',
      workflow_id: 'uuid-w1',
    });
    console.assert(result === false, 'No debe notificar en INSERT');
  },
};
