/**
 * D20 - Recover Orphan Anchors
 *
 * Decisión: ¿Se debe disparar recovery para anchors huérfanos?
 *
 * Contrato: docs/migration/D20_RECOVER_ORPHAN_ANCHORS.md
 * Fecha: 2026-01-24
 * Grupo: 4 - Anchoring / Infra (worker)
 */

export interface RecoverOrphanAnchorsInput {
  document: {
    id: string;
    created_at: string;
    polygon_status?: string | null;
    bitcoin_status?: string | null;
    has_polygon_anchor: boolean;
    has_bitcoin_anchor: boolean;
  };
  now: string;
}

/**
 * Decide si un documento necesita recovery de anchor Polygon
 */
export function shouldRecoverPolygon(input: RecoverOrphanAnchorsInput): boolean {
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const recent = new Date(input.document.created_at) > new Date(Date.parse(input.now) - TWO_HOURS_MS);

  return recent &&
         input.document.polygon_status === 'pending' &&
         !input.document.has_polygon_anchor;
}

/**
 * Decide si un documento necesita recovery de anchor Bitcoin
 */
export function shouldRecoverBitcoin(input: RecoverOrphanAnchorsInput): boolean {
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const recent = new Date(input.document.created_at) > new Date(Date.parse(input.now) - TWO_HOURS_MS);

  return recent &&
         input.document.bitcoin_status === 'pending' &&
         !input.document.has_bitcoin_anchor;
}
