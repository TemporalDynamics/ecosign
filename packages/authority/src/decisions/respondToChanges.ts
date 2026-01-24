/**
 * D15 - Respond To Changes
 *
 * Decisión: ¿Puede el owner aceptar o rechazar una solicitud de cambios?
 *
 * Contrato: docs/migration/D15_RESPOND_TO_CHANGES.md
 * Fecha: 2026-01-24
 * Grupo: 2 - Workflow (mutacion fuerte, alto impacto)
 */

export interface RespondToChangesInput {
  actor_id: string | null;
  payload: {
    workflowId?: string;
    signerId?: string;
    action?: 'accept' | 'reject';
    newDocumentUrl?: string;
    newDocumentHash?: string;
  };
  workflow: {
    id: string;
    owner_id: string;
    status: string;
  } | null;
  signer: {
    id: string;
    workflow_id: string;
    change_request_status: string | null;
  } | null;
}

/**
 * Decide si el owner puede responder a una solicitud de cambios.
 */
export function shouldRespondToChanges(input: RespondToChangesInput): boolean {
  if (!input.actor_id) return false;

  const p = input.payload || {};
  if (!p.workflowId || !p.signerId || !p.action) return false;
  if (!['accept', 'reject'].includes(p.action)) return false;

  if (!input.workflow || !input.signer) return false;

  if (input.workflow.owner_id !== input.actor_id) return false;
  if (input.workflow.status !== 'active') return false;
  if (input.signer.change_request_status !== 'pending') return false;
  if (input.signer.workflow_id !== input.workflow.id) return false;

  if (p.action === 'accept' && (!p.newDocumentUrl || !p.newDocumentHash)) return false;

  return true;
}
