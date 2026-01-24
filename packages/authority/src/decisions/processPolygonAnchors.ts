/**
 * D21 - Process Polygon Anchors
 *
 * Decisión: ¿Se debe confirmar/finalizar un anchor Polygon pendiente?
 *
 * Contrato: docs/migration/D21_PROCESS_POLYGON_ANCHORS.md
 * Fecha: 2026-01-24
 * Grupo: 4 - Anchoring / Infra (worker)
 */

export interface ProcessPolygonAnchorInput {
  anchor: {
    id: string;
    anchor_type: string;
    polygon_tx_hash?: string | null;
    polygon_attempts?: number | null;
  };
  receipt: {
    status?: number | null;
    blockNumber?: number | null;
  } | null;
  maxAttempts: number;
}

/**
 * Decide si un anchor Polygon debe ser confirmado
 */
export function shouldConfirmPolygonAnchor(input: ProcessPolygonAnchorInput): boolean {
  if (input.anchor.anchor_type !== 'polygon') return false;
  if (!input.anchor.polygon_tx_hash) return false;
  if (!input.receipt) return false;
  if (input.receipt.status !== 1) return false;

  const attempts = (input.anchor.polygon_attempts ?? 0) + 1;
  if (attempts > input.maxAttempts) return false;

  return true;
}
