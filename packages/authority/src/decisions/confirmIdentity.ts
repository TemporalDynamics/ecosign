/**
 * D11 - Confirm Signer Identity
 *
 * Decisión: ¿Se debe confirmar/registrar la identidad de un firmante?
 *
 * Contrato: docs/migration/D11_CONFIRM_IDENTITY.md
 * Fecha: 2026-01-23
 * Grupo: 2 - Workflow (medio impacto, validación de identidad)
 */

export interface ConfirmIdentityInput {
  /**
   * ID del usuario autenticado (puede ser signer o service role)
   */
  actor_id?: string | null;

  /**
   * Datos del signer
   */
  signer: {
    id: string;
    email: string;
    name: string | null;
    status: string;
    workflow_id: string;
  } | null;

  /**
   * Datos de identidad a confirmar
   */
  identity: {
    firstName: string;
    lastName: string;
    confirmedRecipient: boolean;
    acceptedLogging: boolean;
  };

  /**
   * Datos del workflow (opcional)
   */
  workflow?: {
    status: string;
  } | null;
}

/**
 * Decide si se debe confirmar la identidad de un firmante
 *
 * Invariantes:
 * - Signer debe existir
 * - firstName y lastName no pueden estar vacíos (después de trim)
 * - confirmedRecipient debe ser true (aceptación de ser destinatario)
 * - acceptedLogging debe ser true (aceptación de registro)
 * - Signer no debe estar en estado terminal (signed/rejected/cancelled)
 * - Signer no debe tener nombre confirmado previamente
 *
 * @param input - Datos de entrada para la decisión
 * @returns true si la confirmación es válida, false en caso contrario
 */
export function shouldConfirmIdentity(input: ConfirmIdentityInput): boolean {
  // 1. Signer debe existir
  if (!input.signer) {
    return false;
  }

  // 2. firstName y lastName no pueden estar vacíos
  const firstName = input.identity.firstName?.trim();
  const lastName = input.identity.lastName?.trim();

  if (!firstName || !lastName) {
    return false;
  }

  // 3. confirmedRecipient debe ser true
  if (!input.identity.confirmedRecipient) {
    return false;
  }

  // 4. acceptedLogging debe ser true
  if (!input.identity.acceptedLogging) {
    return false;
  }

  // 5. Signer no debe estar en estado terminal
  const terminalStatuses = ['signed', 'rejected', 'cancelled'];
  if (terminalStatuses.includes(input.signer.status)) {
    return false;
  }

  // 6. Signer no debe tener nombre confirmado previamente
  if (input.signer.name !== null && input.signer.name.trim() !== '') {
    return false;
  }

  // Todas las condiciones cumplidas
  return true;
}
