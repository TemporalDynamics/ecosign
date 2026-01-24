/**
 * D22 - Process Bitcoin Anchors
 *
 * Decisión: ¿Se debe enviar/verificar un anchor Bitcoin vía OpenTimestamps?
 *
 * Contrato: docs/migration/D22_PROCESS_BITCOIN_ANCHORS.md
 * Fecha: 2026-01-24
 * Grupo: 4 - Anchoring / Infra (worker)
 */

export interface ProcessBitcoinAnchorInput {
  anchor: {
    id: string;
    anchor_status: string;
    ots_proof?: string | null;
    ots_calendar_url?: string | null;
    bitcoin_attempts?: number | null;
  };
  userDoc: {
    bitcoin_status?: string | null;
    has_polygon_anchor?: boolean | null;
  } | null;
  verification: {
    confirmed: boolean;
    txid?: string | null;
    blockHeight?: number | null;
    upgraded?: boolean;
  };
  maxAttempts: number;
}

/**
 * Decide si un anchor Bitcoin debe ser enviado a OpenTimestamps
 */
export function shouldSubmitBitcoinAnchor(input: ProcessBitcoinAnchorInput): boolean {
  return input.anchor.anchor_status === 'queued';
}

/**
 * Decide si un anchor Bitcoin debe ser confirmado
 */
export function shouldConfirmBitcoinAnchor(input: ProcessBitcoinAnchorInput): boolean {
  if (input.userDoc?.bitcoin_status === 'cancelled') return false;
  if (!input.verification.confirmed) return false;

  const attempts = (input.anchor.bitcoin_attempts ?? 0) + 1;
  if (attempts > input.maxAttempts) return false;

  return true;
}
