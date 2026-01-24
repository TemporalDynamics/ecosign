/**
 * D13 - Start Signature Workflow
 *
 * Decisión: ¿Se debe crear un nuevo workflow de firmas y sus entidades base?
 *
 * Contrato: docs/migration/D13_START_SIGNATURE_WORKFLOW.md
 * Fecha: 2026-01-24
 * Grupo: 2 - Workflow (mutaciones fuertes, alto impacto)
 */

export interface StartWorkflowInput {
  actor_id: string | null;
  payload: {
    documentUrl?: string;
    documentHash?: string;
    originalFilename?: string;
    documentEntityId?: string;
    signers?: Array<{
      email: string;
      name?: string;
      signingOrder: number;
      requireLogin?: boolean;
      requireNda?: boolean;
      quickAccess?: boolean;
    }>;
    forensicConfig?: {
      rfc3161: boolean;
      polygon: boolean;
      bitcoin: boolean;
    };
    deliveryMode?: 'email' | 'link';
  };
}

/**
 * Decide si se puede iniciar un workflow de firmas.
 */
export function shouldStartSignatureWorkflow(input: StartWorkflowInput): boolean {
  if (!input.actor_id) return false;

  const p = input.payload || {};
  if (!p.documentUrl || !p.documentHash || !p.originalFilename) return false;
  if (!p.signers || p.signers.length === 0) return false;

  if (!p.forensicConfig) return false;
  const { rfc3161, polygon, bitcoin } = p.forensicConfig;
  if ([rfc3161, polygon, bitcoin].some(v => typeof v !== 'boolean')) return false;

  if (p.deliveryMode && !['email', 'link'].includes(p.deliveryMode)) return false;

  const orders = p.signers.map(s => s.signingOrder).sort((a, b) => a - b);
  if (orders[0] !== 1) return false;
  for (let i = 0; i < orders.length; i++) {
    if (orders[i] !== i + 1) return false;
  }

  return true;
}
