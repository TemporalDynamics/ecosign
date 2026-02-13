/**
 * D9 - Decisión: ¿Cancelar workflow?
 *
 * Decisión canónica pura que determina si un workflow puede cancelarse.
 *
 * @module decisions/cancelWorkflow
 * @phase Fase 2 - Shadow mode
 * @see docs/migration/D9_CANCEL_WORKFLOW.md
 */

export interface CancelWorkflowInput {
  actor_id: string | null;
  workflow: { owner_id: string; status: string } | null;
}

/**
 * Decide si se debe cancelar un workflow.
 *
 * Regla canónica:
 * - Actor debe existir
 * - Workflow debe existir
 * - Actor debe ser owner
 * - Workflow debe estar en estado `ready` o `active`
 *
 * @param input - Parámetros de la decisión
 * @returns true si se puede cancelar, false en caso contrario
 */
export function shouldCancelWorkflow(input: CancelWorkflowInput): boolean {
  if (!input.actor_id) return false;
  if (!input.workflow) return false;
  if (input.workflow.owner_id !== input.actor_id) return false;
  if (!['ready', 'active'].includes(input.workflow.status)) {
    return false;
  }
  return true;
}

/**
 * Tests integrados (para validación rápida)
 */
export const tests = {
  'Happy path: owner + active': () => {
    const result = shouldCancelWorkflow({
      actor_id: 'owner-1',
      workflow: { owner_id: 'owner-1', status: 'active' },
    });
    console.assert(result === true, 'Debe permitir cancelación para owner activo');
  },
  'Happy path: owner + ready': () => {
    const result = shouldCancelWorkflow({
      actor_id: 'owner-1',
      workflow: { owner_id: 'owner-1', status: 'ready' },
    });
    console.assert(result === true, 'Debe permitir cancelación para owner en estado ready');
  },
};
