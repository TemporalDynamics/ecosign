/**
 * D7 - Decisión: ¿Notificar workflow completado?
 *
 * Decisión canónica pura que determina si se deben encolar notificaciones
 * cuando un workflow transiciona a status = 'completed'.
 *
 * @module decisions/notifyWorkflowCompleted
 * @phase Fase 2 - Shadow mode
 * @see docs/migration/D7_NOTIFY_WORKFLOW_COMPLETED.md
 */

export interface NotifyWorkflowCompletedInput {
  operation: 'INSERT' | 'UPDATE';
  old_status: string | null;
  new_status: string;
  workflow_id: string;
}

/**
 * Decide si se deben encolar notificaciones cuando un workflow se completa.
 *
 * Regla canónica:
 * - Solo en UPDATE
 * - Solo si NEW.status = 'completed'
 * - Solo si OLD.status != 'completed' (evita duplicados)
 *
 * Side effects (NO ejecutados por esta función):
 * - INSERT workflow_notifications (recipient = owner, type = workflow_completed)
 * - INSERT workflow_notifications (recipient = signer, type = workflow_completed)
 *
 * @param input - Parámetros de la decisión
 * @returns true si se deben encolar las notificaciones, false en caso contrario
 */
export function shouldNotifyWorkflowCompleted(
  input: NotifyWorkflowCompletedInput
): boolean {
  // 1. Solo en UPDATE
  if (input.operation !== 'UPDATE') {
    return false;
  }

  // 2. Solo si el estado nuevo es 'completed'
  if (input.new_status !== 'completed') {
    return false;
  }

  // 3. Solo si el estado anterior NO era 'completed' (evita duplicados)
  // Nota: old_status puede ser null en casos edge (legacy)
  if (input.old_status === 'completed') {
    return false;
  }

  // Todas las condiciones cumplidas → Encolar notificaciones
  return true;
}

/**
 * Tests integrados (para validación rápida)
 */
export const tests = {
  'UPDATE active → completed (happy path)': () => {
    const result = shouldNotifyWorkflowCompleted({
      operation: 'UPDATE',
      old_status: 'active',
      new_status: 'completed',
      workflow_id: 'uuid-w1',
    });
    console.assert(result === true, 'Debe notificar en transición a completed');
  },

  'UPDATE active → active (no completed)': () => {
    const result = shouldNotifyWorkflowCompleted({
      operation: 'UPDATE',
      old_status: 'active',
      new_status: 'active',
      workflow_id: 'uuid-w1',
    });
    console.assert(result === false, 'No debe notificar si no cambia a completed');
  },

  'UPDATE completed → completed (duplicado)': () => {
    const result = shouldNotifyWorkflowCompleted({
      operation: 'UPDATE',
      old_status: 'completed',
      new_status: 'completed',
      workflow_id: 'uuid-w1',
    });
    console.assert(result === false, 'No debe re-notificar si ya estaba completed');
  },

  'INSERT con status completed (no aplica)': () => {
    const result = shouldNotifyWorkflowCompleted({
      operation: 'INSERT',
      old_status: null,
      new_status: 'completed',
      workflow_id: 'uuid-w1',
    });
    console.assert(result === false, 'No debe notificar en INSERT');
  },

  'UPDATE active → cancelled (no completed)': () => {
    const result = shouldNotifyWorkflowCompleted({
      operation: 'UPDATE',
      old_status: 'active',
      new_status: 'cancelled',
      workflow_id: 'uuid-w1',
    });
    console.assert(result === false, 'No debe notificar en cancelación');
  },

  'UPDATE null → completed (edge legacy)': () => {
    const result = shouldNotifyWorkflowCompleted({
      operation: 'UPDATE',
      old_status: null,
      new_status: 'completed',
      workflow_id: 'uuid-w1',
    });
    console.assert(result === true, 'Debe notificar si OLD.status es null');
  },

  'UPDATE processing → completed (estado previo desconocido)': () => {
    const result = shouldNotifyWorkflowCompleted({
      operation: 'UPDATE',
      old_status: 'processing',
      new_status: 'completed',
      workflow_id: 'uuid-w1',
    });
    console.assert(result === true, 'Debe notificar desde cualquier estado no-completed');
  },
};
