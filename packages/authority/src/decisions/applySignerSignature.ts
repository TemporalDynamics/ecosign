/**
 * D12 - Apply Signer Signature
 *
 * Decisión: ¿Se debe aplicar la firma de un signer a un workflow?
 *
 * Contrato: docs/migration/D12_APPLY_SIGNER_SIGNATURE.md
 * Fecha: 2026-01-24
 * Grupo: 2 - Workflow (mutacion fuerte, alto impacto)
 */

export interface ApplySignerSignatureInput {
  signer: {
    id: string;
    workflow_id: string;
    status: string;
    token_expires_at: string | null;
    token_revoked_at: string | null;
    otp_verified: boolean;
    require_login?: boolean | null;
    quick_access?: boolean | null;
  } | null;
  workflow: {
    id: string;
    document_entity_id: string | null;
  } | null;
  payload: {
    signerId?: string;
    accessToken?: string;
    workflowId?: string;
  };
}

/**
 * Decide si la firma de un signer puede ser aplicada.
 */
export function shouldApplySignerSignature(input: ApplySignerSignatureInput): boolean {
  const p = input.payload || {};
  if (!p.signerId && !p.accessToken) return false;
  if (p.signerId && !p.workflowId) return false;

  if (!input.signer) return false;
  if (!input.workflow) return false;

  if (p.workflowId && input.signer.workflow_id !== p.workflowId) return false;

  const terminal = ['signed', 'cancelled', 'expired'];
  if (terminal.includes(input.signer.status)) return false;

  if (input.signer.status !== 'ready_to_sign') return false;

  const otpRequired = !(input.signer.quick_access || input.signer.require_login === false);
  if (otpRequired && !input.signer.otp_verified) return false;

  if (input.signer.token_revoked_at) return false;
  if (input.signer.token_expires_at && new Date(input.signer.token_expires_at) < new Date()) {
    return false;
  }

  return true;
}
