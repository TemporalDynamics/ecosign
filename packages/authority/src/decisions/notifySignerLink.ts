/**
 * D5 - Decisión: ¿Notificar link de firma a signer?
 *
 * Decisión canónica pura que determina si se debe encolar una notificación
 * cuando se crea un nuevo firmante en un workflow.
 *
 * @module decisions/notifySignerLink
 * @phase Fase 2 - Shadow mode
 * @see docs/migration/D5_NOTIFY_SIGNER_LINK.md
 */

/**
 * Input para la decisión de notificación de signer link
 */
export interface NotifySignerLinkInput {
  /** Tipo de operación en la tabla workflow_signers */
  operation: 'INSERT' | 'UPDATE';

  /** Estado actual del signer (canónico) */
  signer_status: string;

  /** ID del signer */
  signer_id: string;

  /** ID del workflow al que pertenece */
  workflow_id: string;

  /** Si ya existe una notificación previa para este signer/workflow */
  has_previous_notification: boolean;
}

/**
 * Estados válidos para encolar notificación
 *
 * - invited: Firmante invitado (nuevo estado canónico)
 * - ready_to_sign: Firmante listo para firmar (su turno)
 *
 * Estados que NO disparan notificación:
 * - awaiting: Aún no es su turno
 * - signed: Ya firmó (no necesita link)
 * - rejected: Rechazó la firma
 * - pending: Estado legacy, no usar
 */
const VALID_STATUSES_FOR_NOTIFICATION = ['invited', 'ready_to_sign'] as const;

/**
 * Decisión canónica: ¿Debería encolarse una notificación de link de firma?
 *
 * Regla pura:
 * - Operación es INSERT (no UPDATE)
 * - Estado del signer es válido (invited o ready_to_sign)
 * - NO existe notificación previa (deduplicación)
 *
 * @param input - Parámetros de la decisión
 * @returns true si se debe encolar la notificación
 *
 * @example
 * ```typescript
 * // Caso normal: crear signer invited
 * shouldNotifySignerLink({
 *   operation: 'INSERT',
 *   signer_status: 'invited',
 *   signer_id: 'abc-123',
 *   workflow_id: 'xyz-789',
 *   has_previous_notification: false
 * }) // → true
 *
 * // Caso: signer ya firmado
 * shouldNotifySignerLink({
 *   operation: 'INSERT',
 *   signer_status: 'signed',
 *   signer_id: 'abc-123',
 *   workflow_id: 'xyz-789',
 *   has_previous_notification: false
 * }) // → false
 *
 * // Caso: notificación duplicada
 * shouldNotifySignerLink({
 *   operation: 'INSERT',
 *   signer_status: 'invited',
 *   signer_id: 'abc-123',
 *   workflow_id: 'xyz-789',
 *   has_previous_notification: true
 * }) // → false
 * ```
 */
export function shouldNotifySignerLink(input: NotifySignerLinkInput): boolean {
  // 1. Solo en INSERT (no en UPDATE)
  if (input.operation !== 'INSERT') {
    return false;
  }

  // 2. Solo estados válidos
  if (!VALID_STATUSES_FOR_NOTIFICATION.includes(input.signer_status as any)) {
    return false;
  }

  // 3. No duplicar si ya existe notificación
  if (input.has_previous_notification) {
    return false;
  }

  // Todas las condiciones cumplidas → encolar notificación
  return true;
}

/**
 * Helper: Convierte la decisión booleana a formato string para logs
 */
export function notifySignerLinkDecisionToString(should: boolean): string {
  return should ? 'enqueue_notification' : 'noop';
}
