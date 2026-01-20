/**
 * Protection Level Derivation (Client-side)
 *
 * Contract: docs/contratos/PROTECTION_LEVEL_RULES.md
 *
 * Pure function: derives protection level from events[]
 * NEVER reads from stored state, NEVER persists level
 *
 * Monotonic: level can only increase, never decrease
 * Reproducible: same events[] = same level (today and in 20 years)
 */

export type ProtectionLevel = 'NONE' | 'ACTIVE' | 'REINFORCED' | 'TOTAL';

export interface Event {
  kind: string;
  at: string;
  [key: string]: unknown;
}

export interface TsaEvent extends Event {
  kind: 'tsa.confirmed' | 'tsa.failed';
  witness_hash?: string;
  tsa?: {
    token_b64: string;
    gen_time?: string;
  };
  payload?: Record<string, unknown>;
}

export interface AnchorEvent extends Event {
  kind: 'anchor' | 'anchor.confirmed' | 'anchor.pending' | 'anchor.failed';
  anchor?: {
    network: 'polygon' | 'bitcoin';
    witness_hash?: string;
    txid?: string;
    block_height?: number;
    confirmed_at?: string;
  };
  payload?: Record<string, unknown>;
}

/**
 * Derive protection level from events (canonical implementation)
 *
 * Contract: docs/contratos/PROTECTION_LEVEL_RULES.md
 *
 * Rules:
 * - NONE: No TSA
 * - ACTIVE: Has TSA
 * - REINFORCED: Has TSA + first anchor (Polygon OR Bitcoin)
 * - TOTAL: Has TSA + Polygon anchor + Bitcoin anchor (both)
 *
 * Monotonic: Level can only increase, never decrease
 *
 * @param events - Array of events from document_entities
 * @returns Protection level string
 */
export function deriveProtectionLevel(events: Event[]): ProtectionLevel {
  if (!Array.isArray(events) || events.length === 0) {
    return 'NONE';
  }

  // Check for TSA event
  const hasTsa = events.some((e): e is TsaEvent =>
    e.kind === 'tsa.confirmed' &&
    (typeof (e as any).witness_hash === 'string' ||
      typeof (e as any).payload?.witness_hash === 'string') &&
    (typeof (e as any).tsa?.token_b64 === 'string' ||
      typeof (e as any).payload?.token_b64 === 'string')
  );

  // Check for confirmed Polygon anchor
  const hasPolygon = events.some((e): e is AnchorEvent =>
    (e.kind === 'anchor' || e.kind === 'anchor.confirmed') &&
    ((e as any).anchor?.network === 'polygon' ||
      (e as any).payload?.network === 'polygon') &&
    (typeof (e as any).anchor?.confirmed_at === 'string' ||
      typeof (e as any).payload?.confirmed_at === 'string')
  );

  // Check for confirmed Bitcoin anchor
  const hasBitcoin = events.some((e): e is AnchorEvent =>
    (e.kind === 'anchor' || e.kind === 'anchor.confirmed') &&
    ((e as any).anchor?.network === 'bitcoin' ||
      (e as any).payload?.network === 'bitcoin') &&
    (typeof (e as any).anchor?.confirmed_at === 'string' ||
      typeof (e as any).payload?.confirmed_at === 'string')
  );

  // Apply derivation rules (order matters for correctness)
  // TOTAL: TSA + both anchors (Polygon AND Bitcoin)
  if (hasBitcoin && hasPolygon && hasTsa) return 'TOTAL';
  // REINFORCED: TSA + first anchor (Polygon OR Bitcoin)
  if ((hasPolygon || hasBitcoin) && hasTsa) return 'REINFORCED';
  // ACTIVE: TSA only
  if (hasTsa) return 'ACTIVE';
  return 'NONE';
}

/**
 * Get human-readable label for protection level (Spanish)
 */
export function getProtectionLevelLabel(level: ProtectionLevel): string {
  const labels: Record<ProtectionLevel, string> = {
    NONE: 'Sin protección',
    ACTIVE: 'Protección activa',
    REINFORCED: 'Protección reforzada',
    TOTAL: 'Protección total',
  };
  return labels[level];
}

/**
 * Get UI color for protection level (Tailwind-compatible)
 */
export function getProtectionLevelColor(level: ProtectionLevel): string {
  const colors: Record<ProtectionLevel, string> = {
    NONE: 'gray',
    ACTIVE: 'green',
    REINFORCED: 'blue',
    TOTAL: 'purple',
  };
  return colors[level];
}

/**
 * Get badge variant for protection level (for Badge component)
 */
export function getProtectionLevelBadgeVariant(
  level: ProtectionLevel
): 'default' | 'secondary' | 'success' | 'info' | 'warning' {
  const variants: Record<ProtectionLevel, 'default' | 'secondary' | 'success' | 'info' | 'warning'> = {
    NONE: 'secondary',
    ACTIVE: 'success',
    REINFORCED: 'info',
    TOTAL: 'default', // Will be styled with purple
  };
  return variants[level];
}

/**
 * Get description for protection level (evidential copy, not promissory)
 */
export function getProtectionLevelDescription(level: ProtectionLevel): string {
  const descriptions: Record<ProtectionLevel, string> = {
    NONE: 'Documento sin evidencia temporal verificable',
    ACTIVE: 'Evidencia temporal certificada (TSA)',
    REINFORCED: 'Evidencia temporal + registro público (Polygon o Bitcoin)',
    TOTAL: 'Evidencia temporal + registros públicos múltiples (Polygon + Bitcoin)',
  };
  return descriptions[level];
}

/**
 * Get TSA event from events array (if exists)
 */
export function getTsaEvent(events: Event[]): TsaEvent | null {
  return (events.find((e): e is TsaEvent =>
    e.kind === 'tsa.confirmed' &&
    (typeof (e as any).witness_hash === 'string' ||
      typeof (e as any).payload?.witness_hash === 'string') &&
    (typeof (e as any).tsa?.token_b64 === 'string' ||
      typeof (e as any).payload?.token_b64 === 'string')
  ) || null);
}

/**
 * Get anchor events from events array
 */
export function getAnchorEvents(events: Event[]): AnchorEvent[] {
  return events.filter((e): e is AnchorEvent =>
    (e.kind === 'anchor' || e.kind === 'anchor.confirmed') &&
    (typeof (e as any).anchor?.network === 'string' ||
      typeof (e as any).payload?.network === 'string') &&
    (typeof (e as any).anchor?.confirmed_at === 'string' ||
      typeof (e as any).payload?.confirmed_at === 'string')
  );
}

/**
 * Get anchor event for specific network (if exists)
 */
export function getAnchorEvent(events: Event[], network: 'polygon' | 'bitcoin'): AnchorEvent | null {
  return (events.find((e): e is AnchorEvent =>
    (e.kind === 'anchor' || e.kind === 'anchor.confirmed') &&
    ((e as any).anchor?.network === network ||
      (e as any).payload?.network === network) &&
    (typeof (e as any).anchor?.confirmed_at === 'string' ||
      typeof (e as any).payload?.confirmed_at === 'string')
  ) || null);
}

/**
 * Check if events array has TSA
 */
export function hasTsa(events: Event[]): boolean {
  return getTsaEvent(events) !== null;
}

/**
 * Check if events array has anchor for specific network
 */
export function hasAnchor(events: Event[], network: 'polygon' | 'bitcoin'): boolean {
  return getAnchorEvent(events, network) !== null;
}
