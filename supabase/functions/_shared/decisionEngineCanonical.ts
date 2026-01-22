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
