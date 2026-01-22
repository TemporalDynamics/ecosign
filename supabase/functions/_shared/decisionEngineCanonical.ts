/**
 * Decision Engine Canónico - Lógica de Decisión Pura
 *
 * Este archivo contiene la implementación canónica de las decisiones
 * del sistema. Se usa para validación en modo shadow durante la migración.
 *
 * IMPORTANTE: Este código NO afecta el sistema actual. Solo se usa para
 * comparar que la lógica canónica coincida con la lógica del executor.
 *
 * Origen: packages/contracts-runtime/decisionEngine.ts
 * Fase: Paso 1 - Shadow validation para run_tsa
 */

export type EventLike = { kind?: string };

/**
 * Decisión canónica: ¿debería encolarse run_tsa?
 *
 * Regla pura basada únicamente en eventos:
 * - Si hay solicitud de protección Y no hay TSA confirmado → run_tsa
 * - Caso contrario → noop
 *
 * @param events - Eventos canónicos del documento
 * @returns true si se debería encolar run_tsa
 */
export const shouldEnqueueRunTsa = (events: EventLike[]): boolean => {
  const hasRequest = events.some((event) => event.kind === 'document.protected.requested');
  const hasTsaConfirmed = events.some((event) => event.kind === 'tsa.confirmed');

  return hasRequest && !hasTsaConfirmed;
};

/**
 * Convierte la decisión booleana canónica al formato actual del executor
 * para facilitar la comparación shadow.
 *
 * @param events - Eventos canónicos del documento
 * @returns Decisión en formato compatible con executor actual
 */
export const decideRunTsaCanonical = (events: EventLike[]): 'run_tsa' | 'noop' => {
  return shouldEnqueueRunTsa(events) ? 'run_tsa' : 'noop';
};

/**
 * D2 - Estado protegido simple
 *
 * Derivación: ¿El documento completó su protección básica (TSA)?
 *
 * Esta NO es una decisión de ejecución (no encola jobs).
 * Es una derivación de estado para UI y validaciones.
 *
 * Regla canónica:
 * - Tiene TSA confirmado → protegido
 * - No tiene TSA → procesando (o sin protección)
 *
 * Equivalencia con UI actual:
 * - UI: deriveProtectionLevel(events) !== 'NONE'
 * - Canónico: isDocumentProtected(events)
 *
 * @param events - Eventos canónicos del documento
 * @returns true si el documento está protegido (tiene TSA)
 */
export const isDocumentProtected = (events: EventLike[]): boolean => {
  return events.some((event) => event.kind === 'tsa.confirmed');
};

// ============================================================================
// D4 - Anchors pendientes (Polygon / Bitcoin)
// ============================================================================

/**
 * Helper: Verifica si hay un anchor confirmado para una red específica
 *
 * Valida causalidad temporal: confirmed_at >= event.at
 *
 * @param events - Eventos canónicos del documento
 * @param network - Red blockchain ('polygon' | 'bitcoin')
 * @returns true si hay anchor confirmado válido
 */
const hasAnchorConfirmed = (events: EventLike[], network: 'polygon' | 'bitcoin'): boolean => {
  return events.some((event: any) => {
    // Verificar que sea el tipo correcto de evento
    if (event.kind !== 'anchor' && event.kind !== 'anchor.confirmed') {
      return false;
    }

    // Verificar que tenga la red correcta
    const hasCorrectNetwork = (event.anchor?.network === network || event.payload?.network === network);
    if (!hasCorrectNetwork) {
      return false;
    }

    // Verificar que tenga confirmed_at
    const confirmedAtValue = event.anchor?.confirmed_at || event.payload?.confirmed_at;
    if (!confirmedAtValue) {
      return false;
    }

    // Verificar causalidad temporal: confirmed_at >= at
    try {
      const confirmedAt = new Date(confirmedAtValue);
      const at = new Date(event.at);
      if (confirmedAt < at) {
        return false; // Rompe causalidad temporal
      }
    } catch {
      return false; // Fecha inválida
    }

    return true;
  });
};

/**
 * D4.1 - Decisión: ¿Debería encolarse submit_anchor_polygon?
 *
 * Regla canónica:
 * - Hay TSA confirmado
 * - Se pidió protección polygon
 * - NO hay anchor polygon confirmado
 *
 * @param events - Eventos canónicos del documento
 * @param protection - Array de protecciones solicitadas
 * @returns true si se debería encolar submit_anchor_polygon
 */
export const shouldEnqueuePolygon = (events: EventLike[], protection: string[]): boolean => {
  const hasTsa = events.some((e) => e.kind === 'tsa.confirmed');
  const requiresPolygon = protection.includes('polygon');
  const hasPolygon = hasAnchorConfirmed(events, 'polygon');

  return hasTsa && requiresPolygon && !hasPolygon;
};

/**
 * D4.2 - Decisión: ¿Debería encolarse submit_anchor_bitcoin?
 *
 * Regla canónica:
 * - Hay TSA confirmado
 * - Se pidió protección bitcoin
 * - NO hay anchor bitcoin confirmado
 *
 * @param events - Eventos canónicos del documento
 * @param protection - Array de protecciones solicitadas
 * @returns true si se debería encolar submit_anchor_bitcoin
 */
export const shouldEnqueueBitcoin = (events: EventLike[], protection: string[]): boolean => {
  const hasTsa = events.some((e) => e.kind === 'tsa.confirmed');
  const requiresBitcoin = protection.includes('bitcoin');
  const hasBitcoin = hasAnchorConfirmed(events, 'bitcoin');

  return hasTsa && requiresBitcoin && !hasBitcoin;
};
