/**
 * Workflow mutation gates (P2.1 Fase 1 - Paso 2)
 * Enforces immutability rules after workflow activation.
 */

import type { WorkflowStatus } from './types.ts';

/**
 * Canonical gate: determines if workflow structure can be mutated.
 * 
 * Rule: Mutations allowed ONLY in 'draft' state.
 * All other states (ready, active, completed, cancelled, rejected, archived) are frozen.
 * 
 * @param workflowStatus - Current workflow status
 * @returns true if mutations are allowed, false otherwise
 */
export function canMutateWorkflow(workflowStatus: WorkflowStatus): boolean {
  return workflowStatus === 'draft';
}

/**
 * Error thrown when attempting to mutate a frozen workflow.
 * Status code: 409 Conflict
 */
export class WorkflowMutationForbiddenError extends Error {
  constructor(
    public readonly workflowStatus: WorkflowStatus,
    message = `Cannot mutate workflow in state: ${workflowStatus}`,
  ) {
    super(message);
    this.name = 'WorkflowMutationForbiddenError';
  }
}

/**
 * Asserts that workflow is mutable, throws otherwise.
 * Use this at the entry of mutation operations.
 */
export function assertMutableWorkflow(workflowStatus: WorkflowStatus): void {
  if (!canMutateWorkflow(workflowStatus)) {
    throw new WorkflowMutationForbiddenError(workflowStatus);
  }
}
