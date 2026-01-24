/**
 * D8 - Decisión: ¿Notificar al creador (detallado)?
 *
 * Decisión canónica pura que determina si se debe encolar una notificación
 * detallada al owner cuando un signer completa su firma (status = 'signed').
 *
 * @module decisions/notifyCreatorDetailed
 * @phase Fase 2 - Shadow mode
 * @see docs/migration/D8_NOTIFY_CREATOR_DETAILED.md
 */

export interface NotifyCreatorDetailedInput {
  operation: 'INSERT' | 'UPDATE';
  old_status: string | null;
  new_status: string;
  signer_id: string;
  workflow_id: string;
}

/**
 * Decide si se debe encolar la notificación detallada al creador.
 *
 * Regla canónica:
 * - Solo en UPDATE
 * - Solo si NEW.status = 'signed'
 * - Solo si OLD.status != 'signed' (evita duplicados)
 *
 * Side effects (NO ejecutados por esta función):
 * - INSERT workflow_notifications (recipient = owner, type = creator_detailed_notification)
 *
 * @param input - Parámetros de la decisión
 * @returns true si se debe encolar la notificación, false en caso contrario
 */
export function shouldNotifyCreatorDetailed(
  input: NotifyCreatorDetailedInput
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
  // Nota: old_status puede ser null en casos edge (legacy)
  if (input.old_status === 'signed') {
    return false;
  }

  // Todas las condiciones cumplidas → Encolar notificación detallada
  return true;
}

/**
 * Tests integrados (para validación rápida)
 */
export const tests = {
  'UPDATE ready_to_sign → signed (happy path)': () => {
    const result = shouldNotifyCreatorDetailed({
      operation: 'UPDATE',
      old_status: 'ready_to_sign',
      new_status: 'signed',
      signer_id: 'uuid-signer-1',
      workflow_id: 'uuid-workflow-1',
    });
    console.assert(result === true, 'Debe notificar en transición a signed');
  },

  'UPDATE invited → signed (skip ready_to_sign)': () => {
    const result = shouldNotifyCreatorDetailed({
      operation: 'UPDATE',
      old_status: 'invited',
      new_status: 'signed',
      signer_id: 'uuid-signer-2',
      workflow_id: 'uuid-workflow-2',
    });
    console.assert(result === true, 'Debe notificar desde invited');
  },

  'UPDATE signed → signed (duplicado)': () => {
    const result = shouldNotifyCreatorDetailed({
      operation: 'UPDATE',
      old_status: 'signed',
      new_status: 'signed',
      signer_id: 'uuid-signer-3',
      workflow_id: 'uuid-workflow-3',
    });
    console.assert(result === false, 'No debe re-notificar si ya estaba signed');
  },

  'UPDATE invited → ready_to_sign (no signed)': () => {
    const result = shouldNotifyCreatorDetailed({
      operation: 'UPDATE',
      old_status: 'invited',
      new_status: 'ready_to_sign',
      signer_id: 'uuid-signer-4',
      workflow_id: 'uuid-workflow-4',
    });
    console.assert(result === false, 'No debe notificar si no llegó a signed');
  },

  'INSERT con status signed': () => {
    const result = shouldNotifyCreatorDetailed({
      operation: 'INSERT',
      old_status: null,
      new_status: 'signed',
      signer_id: 'uuid-signer-5',
      workflow_id: 'uuid-workflow-5',
    });
    console.assert(result === false, 'No debe notificar en INSERT');
  },

  'UPDATE null → signed (edge legacy)': () => {
    const result = shouldNotifyCreatorDetailed({
      operation: 'UPDATE',
      old_status: null,
      new_status: 'signed',
      signer_id: 'uuid-signer-6',
      workflow_id: 'uuid-workflow-6',
    });
    console.assert(result === true, 'Debe notificar si OLD.status es null');
  },

  'UPDATE pending → signed (otro estado válido)': () => {
    const result = shouldNotifyCreatorDetailed({
      operation: 'UPDATE',
      old_status: 'pending',
      new_status: 'signed',
      signer_id: 'uuid-signer-7',
      workflow_id: 'uuid-workflow-7',
    });
    console.assert(result === true, 'Debe notificar desde cualquier estado no-signed');
  },
};
