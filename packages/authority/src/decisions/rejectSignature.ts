/**
 * D10 - Reject Signature (Signer)
 *
 * Decisión: ¿Se debe rechazar/cancelar la participación de un signer en un workflow?
 *
 * Contrato: docs/migration/D10_REJECT_SIGNATURE.md
 * Fecha: 2026-01-23
 * Grupo: 2 - Workflow (alto impacto, estado terminal de signer)
 */

export interface RejectSignatureInput {
  /**
   * ID del usuario autenticado (puede ser email del signer o UUID del owner)
   */
  actor_id: string | null;

  /**
   * Datos del signer a rechazar
   */
  signer: {
    id: string;
    email: string;
    status: string;
    workflow_id: string;
  } | null;

  /**
   * Datos del workflow asociado
   */
  workflow: {
    owner_id: string;
    status: string;
  } | null;
}

/**
 * Decide si un signer puede ser rechazado/cancelado
 *
 * Invariantes:
 * - Actor debe estar autenticado
 * - Signer debe existir y no estar en estado terminal (signed, rejected)
 * - Workflow debe existir y no estar en estado terminal (completed, cancelled, archived)
 * - Actor debe ser el signer mismo O el owner del workflow
 *
 * @param input - Datos de entrada para la decisión
 * @returns true si el rechazo es válido, false en caso contrario
 */
export function shouldRejectSignature(input: RejectSignatureInput): boolean {
  // 1. Actor debe estar autenticado
  if (!input.actor_id) {
    return false;
  }

  // 2. Signer debe existir
  if (!input.signer) {
    return false;
  }

  // 3. Workflow debe existir
  if (!input.workflow) {
    return false;
  }

  // 4. Signer no puede estar en estado terminal
  const terminalSignerStatuses = ['signed', 'rejected'];
  if (terminalSignerStatuses.includes(input.signer.status)) {
    return false;
  }

  // 5. Workflow no puede estar en estado terminal
  const terminalWorkflowStatuses = ['completed', 'cancelled', 'archived'];
  if (terminalWorkflowStatuses.includes(input.workflow.status)) {
    return false;
  }

  // 6. Actor debe ser el signer mismo o el owner del workflow
  const isOwner = input.actor_id === input.workflow.owner_id;
  const isSigner = input.actor_id === input.signer.email;

  if (!isOwner && !isSigner) {
    return false;
  }

  // Todas las condiciones cumplidas
  return true;
}
