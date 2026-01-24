/**
 * D14 - Request Document Changes
 *
 * Decisión: ¿Se debe aceptar una solicitud de cambios del signer?
 *
 * Contrato: docs/migration/D14_REQUEST_DOCUMENT_CHANGES.md
 * Fecha: 2026-01-24
 * Grupo: 2 - Workflow (mutacion fuerte, alto impacto)
 */

export interface RequestDocumentChangesInput {
  signer: {
    id: string;
    status: string;
    change_request_status?: string | null;
  } | null;
  workflow: {
    status: string | null;
  } | null;
  payload: {
    accessToken?: string;
    annotations?: Array<unknown>;
  };
}

/**
 * Decide si un signer puede solicitar cambios.
 */
export function shouldRequestDocumentChanges(input: RequestDocumentChangesInput): boolean {
  const p = input.payload || {};
  if (!p.accessToken) return false;
  if (!p.annotations || p.annotations.length === 0) return false;

  if (!input.signer) return false;
  if (!input.workflow) return false;

  if (input.signer.status !== 'ready_to_sign') return false;

  const terminalWorkflow = ['completed', 'cancelled', 'archived', 'expired'];
  if (terminalWorkflow.includes(input.workflow.status ?? '')) return false;

  if (input.signer.change_request_status === 'pending') return false;

  return true;
}
