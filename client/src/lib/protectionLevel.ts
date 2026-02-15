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

export type ProtectionLevel =
  | 'NONE'
  | 'TSA_CONFIRMED'
  | 'TSA_REKOR_CONFIRMED'
  | 'ONE_CHAIN_CONFIRMED'
  | 'TWO_CHAINS_CONFIRMED';

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
 * - TSA_CONFIRMED: Has TSA only
 * - TSA_REKOR_CONFIRMED: Has TSA + Rekor
 * - ONE_CHAIN_CONFIRMED: Has TSA + Rekor + one chain (Polygon OR Bitcoin)
 * - TWO_CHAINS_CONFIRMED: Has TSA + Rekor + both chains (Polygon AND Bitcoin)
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

  // Check for Rekor confirmation
  const hasRekor = events.some((e: Event) =>
    e.kind === 'rekor.confirmed' &&
    typeof (e as any).payload?.statement_hash === 'string' &&
    typeof (e as any).payload?.witness_hash === 'string'
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

  if (hasTsa && hasRekor && hasPolygon && hasBitcoin) return 'TWO_CHAINS_CONFIRMED';
  if (hasTsa && hasRekor && (hasPolygon || hasBitcoin)) return 'ONE_CHAIN_CONFIRMED';
  if (hasTsa && hasRekor) return 'TSA_REKOR_CONFIRMED';
  if (hasTsa) return 'TSA_CONFIRMED';
  return 'NONE';
}

/**
 * Get human-readable label for protection level (Spanish)
 */
export function getProtectionLevelLabel(level: ProtectionLevel): string {
  const labels: Record<ProtectionLevel, string> = {
    NONE: 'Sin protección',
    TSA_CONFIRMED: 'TSA confirmado',
    TSA_REKOR_CONFIRMED: 'TSA + Rekor confirmado',
    ONE_CHAIN_CONFIRMED: 'Una cadena confirmada',
    TWO_CHAINS_CONFIRMED: 'Dos cadenas confirmadas',
  };
  return labels[level];
}

/**
 * Get UI color for protection level (Tailwind-compatible)
 */
export function getProtectionLevelColor(level: ProtectionLevel): string {
  const colors: Record<ProtectionLevel, string> = {
    NONE: 'gray',
    TSA_CONFIRMED: 'green',
    TSA_REKOR_CONFIRMED: 'cyan',
    ONE_CHAIN_CONFIRMED: 'blue',
    TWO_CHAINS_CONFIRMED: 'purple',
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
    TSA_CONFIRMED: 'success',
    TSA_REKOR_CONFIRMED: 'info',
    ONE_CHAIN_CONFIRMED: 'info',
    TWO_CHAINS_CONFIRMED: 'default', // Will be styled with purple
  };
  return variants[level];
}

/**
 * Get description for protection level (evidential copy, not promissory)
 */
export function getProtectionLevelDescription(level: ProtectionLevel): string {
  const descriptions: Record<ProtectionLevel, string> = {
    NONE: 'Documento sin evidencia temporal verificable',
    TSA_CONFIRMED: 'Evidencia temporal certificada (TSA)',
    TSA_REKOR_CONFIRMED: 'Evidencia temporal + transparencia pública (Rekor)',
    ONE_CHAIN_CONFIRMED: 'TSA + Rekor + un anclaje blockchain confirmado',
    TWO_CHAINS_CONFIRMED: 'TSA + Rekor + anclaje confirmado en Polygon y Bitcoin',
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
 * Check if events array has TSA confirmation (by kind only)
 * Single source of truth for "protected" state in UI.
 */
export function hasTsaConfirmed(events?: Event[]): boolean {
  if (!Array.isArray(events) || events.length === 0) return false;
  return events.some((event) => event?.kind === 'tsa.confirmed');
}

/**
 * Check if events array has anchor for specific network
 */
export function hasAnchor(events: Event[], network: 'polygon' | 'bitcoin'): boolean {
  return getAnchorEvent(events, network) !== null;
}
