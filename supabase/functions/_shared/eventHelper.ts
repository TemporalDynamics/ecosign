/**
 * Event Helper for Edge Functions
 *
 * Generic helper to append events to document_entities.events[]
 * following the canonical append-only pattern.
 *
 * Usage:
 *   await appendEvent(supabase, documentEntityId, {
 *     kind: 'share_created',
 *     at: new Date().toISOString(),
 *     share: { ... }
 *   }, 'create-signer-link'); // source is optional but valuable
 */

// NOTE: We intentionally accept a loosely-typed Supabase client here.
// The Edge runtime imports supabase-js via different module URLs/versions,
// and strict generic types frequently diverge across functions.

export type GenericEvent = {
  id?: string;
  kind: string;
  at: string; // ISO 8601 timestamp
  v?: number;
  actor?: string;
  entity_id?: string;
  correlation_id?: string;
  [key: string]: any; // Contextual data specific to event kind
};

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

const LEGACY_UNDERSCORE_EVENT_KINDS = new Set([
  // Legacy (pre-dot-notation). Allowed temporarily.
  'protection_enabled',
]);

// Clasificación formal de eventos
export type EventClass = 'evidence' | 'tracking';

export const EVENT_CLASS: Record<string, EventClass> = {
  // Eventos de evidencia fuerte (requieren _source verificable)
  'document.signed': 'evidence',
  'tsa.confirmed': 'evidence',
  'anchor': 'evidence',  // confirmación real
  'artifact.finalized': 'evidence',
  'document.protected.requested': 'evidence',

  // Eventos de seguimiento/fallo (requieren _source verificable)
  'anchor.pending': 'tracking',
  'tsa.failed': 'tracking',
  'anchor.failed': 'tracking',
  'artifact.failed': 'tracking',
  'protection.failed': 'tracking',
};

// Allowlist de fuentes autorizadas para eventos
const AUTHORIZED_SOURCES: Record<string, string[]> = {
  // Eventos de evidencia fuerte (requieren _source verificable)
  'document.signed': ['process-signature'],
  // TSA evidence is emitted only by run-tsa (job-driven).
  'tsa.confirmed': ['run-tsa'],
  'anchor.pending': ['submit-anchor-polygon', 'submit-anchor-bitcoin'],
  'anchor': ['process-polygon-anchors', 'process-bitcoin-anchors'],  // confirmación real
  'artifact.finalized': ['build-artifact'],
  'document.protected.requested': ['start-signature-workflow', 'record-protection-event'],

  // Eventos de seguimiento/fallo (requieren _source verificable)
  'tsa.failed': ['run-tsa'],
  'anchor.failed': ['submit-anchor-*', 'process-polygon-anchors', 'process-bitcoin-anchors'],
  'artifact.failed': ['build-artifact'],
  'protection.failed': ['record-protection-event'],
};

/**
 * Append any event to document_entities.events[]
 *
 * MUST: event.kind must be present
 * MUST: event.at must be ISO 8601 timestamp
 * MUST: events[] is append-only (enforced by DB trigger)
 * MUST: source must be authorized for this event kind (guardrail)
 *
 * @param supabase - Supabase client (with service role key)
 * @param documentEntityId - document_entities.id
 * @param event - Event object with kind, at, and contextual data
 * @param source - Optional: edge function name for forensics (not shown to user)
 * @returns Success/error result
 */
export async function appendEvent(
  supabase: any,
  documentEntityId: string,
  event: GenericEvent,
  source?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Validate event structure
    if (!event.kind || typeof event.kind !== 'string') {
      return { success: false, error: 'Event must have a "kind" string property' };
    }

    if (!event.at || typeof event.at !== 'string') {
      return { success: false, error: 'Event must have an "at" ISO 8601 timestamp' };
    }

    if (event.kind.includes('_') && !LEGACY_UNDERSCORE_EVENT_KINDS.has(event.kind)) {
      return { success: false, error: `Event kind must not contain underscore: "${event.kind}"` };
    }

    // 2. Validate source authority for this event kind (guardrail)
    if (AUTHORIZED_SOURCES[event.kind]) {
      if (!source) {
        return {
          success: false,
          error: `Missing _source for protected event kind "${event.kind}"`
        };
      }
      
      const allowedSources = AUTHORIZED_SOURCES[event.kind];
      const isAuthorized = allowedSources.some(allowed => {
        if (allowed.endsWith('*')) {
          return source.startsWith(allowed.slice(0, -1));
        }
        return source === allowed;
      });
      
      if (!isAuthorized) {
        return {
          success: false,
          error: `Unauthorized source "${source}" for event kind "${event.kind}". Allowed: [${allowedSources.join(', ')}]`
        };
      }
    }

    // Validate ISO 8601 format (basic check)
    try {
      const timestamp = new Date(event.at);
      if (isNaN(timestamp.getTime())) {
        return { success: false, error: 'Event "at" must be valid ISO 8601 timestamp' };
      }
    } catch {
      return { success: false, error: 'Event "at" must be valid ISO 8601 timestamp' };
    }

    const envelope = {
      ...event,
      id: isUuid(event.id) ? event.id : crypto.randomUUID(),
      v: typeof event.v === 'number' ? event.v : 1,
      actor: typeof event.actor === 'string' && event.actor.length > 0 ? event.actor : (source ?? 'unknown'),
      entity_id: isUuid(event.entity_id) ? event.entity_id : documentEntityId,
      correlation_id: isUuid(event.correlation_id) ? event.correlation_id : crypto.randomUUID(),
    };

    const { error: rpcError } = await supabase.rpc('append_document_entity_event', {
      p_document_entity_id: documentEntityId,
      p_event: envelope,
      p_source: source ?? null,
    });

    if (rpcError) {
      return {
        success: false,
        error: `Failed to append event: ${rpcError.message}`
      };
    }

    console.log(`✅ Event appended: ${event.kind} to document_entity ${documentEntityId}${source ? ` (source: ${source})` : ''}`);
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in appendEvent:', error);
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Unexpected error: ${message || 'unknown error'}`
    };
  }
}

/**
 * Utility: Get document_entity_id from user_documents.id
 *
 * Many edge functions work with user_documents.id, but events[] lives
 * in document_entities. This helper bridges the gap.
 *
 * @param supabase - Supabase client
 * @param userDocumentId - user_documents.id
 * @returns document_entity_id or null
 */
export async function getDocumentEntityId(
  supabase: any,
  userDocumentId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_documents')
      .select('document_entity_id')
      .eq('id', userDocumentId)
      .single();

    if (error || !data || !data.document_entity_id) {
      console.error('Failed to get document_entity_id:', error?.message);
      return null;
    }

    return data.document_entity_id;
  } catch (error) {
    console.error('Unexpected error in getDocumentEntityId:', error);
    return null;
  }
}

/**
 * Utility: Get user_documents.id from document_entities.id
 *
 * Used for dual-read migration when callers only know document_entity_id
 * but legacy tables still require user_documents.id.
 *
 * @param supabase - Supabase client
 * @param documentEntityId - document_entities.id
 * @returns user_documents.id or null
 */
export async function getUserDocumentId(
  supabase: any,
  documentEntityId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_documents')
      .select('id')
      .eq('document_entity_id', documentEntityId)
      .single();

    if (error || !data?.id) {
      console.error('Failed to get user_document_id:', error?.message);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Unexpected error in getUserDocumentId:', error);
    return null;
  }
}

/**
 * Utility: Hash IP address for privacy (truncate + hash)
 *
 * We want to record that access happened, but not store full IPs.
 * This creates a truncated hash that's useful for forensics but respects privacy.
 *
 * @param ip - IP address (IPv4 or IPv6)
 * @returns Truncated hash (first 8 chars of SHA-256)
 */
export async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Return first 8 chars (sufficient for correlation, not for reversal)
  return hashHex.substring(0, 8);
}

/**
 * Utility: Extract browser family from user agent
 *
 * @param userAgent - User agent string
 * @returns Browser family (chrome, firefox, safari, edge, other)
 */
export function getBrowserFamily(userAgent: string | null | undefined): string {
  if (!userAgent) return 'unknown';

  const ua = userAgent.toLowerCase();

  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('chrome/') || ua.includes('crios/')) return 'chrome';
  if (ua.includes('firefox/') || ua.includes('fxios/')) return 'firefox';
  if (ua.includes('safari/') && !ua.includes('chrome')) return 'safari';
  if (ua.includes('opera/') || ua.includes('opr/')) return 'opera';

  return 'other';
}

/**
 * Get the classification of an event (evidence or tracking)
 */
export function getEventClass(kind: string): EventClass | undefined {
  return EVENT_CLASS[kind];
}

/**
 * Check if an event is of evidence class (requires stronger validation)
 */
export function isEvidenceEvent(kind: string): boolean {
  return EVENT_CLASS[kind] === 'evidence';
}

/**
 * Check if an event is of tracking class (auxiliary information)
 */
export function isTrackingEvent(kind: string): boolean {
  return EVENT_CLASS[kind] === 'tracking';
}
