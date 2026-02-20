import {
  validateMinimumEvidence,
  validateMonotonicityByStage,
  validateRequiredEvidenceNotNull,
} from './eventValidator.ts';

/**
 * Event Helper for Edge Functions
 *
 * Generic helper to append events to document_entities.events[]
 * following the canonical append-only pattern.
 *
 * Usage:
 *   await appendEvent(supabase, documentEntityId, {
 *     kind: 'share.created',
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

// Clasificación formal de eventos
export type EventClass = 'evidence' | 'tracking';

export const EVENT_CLASS: Record<string, EventClass> = {
  // Eventos de evidencia fuerte (requieren _source verificable)
  'document.signed': 'evidence',
  'tsa.confirmed': 'evidence',
  'anchor': 'evidence',  // confirmación real
  'artifact.finalized': 'evidence',
  'document.protected.requested': 'evidence',
  'document.certified': 'evidence',

  // Eventos de seguimiento/fallo (requieren _source verificable)
  'anchor.pending': 'tracking',
  'tsa.failed': 'tracking',
  'anchor.failed': 'tracking',
  'artifact.failed': 'tracking',
  'artifact.chain.pending': 'tracking',
  'protection.failed': 'tracking',

  // Eventos probatorios (share/NDA) - evidencia contextual
  'share.created': 'evidence',
  'share.opened': 'evidence',
  'nda.accepted': 'evidence',
};

/**
 * Append any event to document_entities.events[]
 *
 * MUST: event.kind must be present
 * MUST: event.at must be ISO 8601 timestamp
 * MUST: events[] is append-only (enforced by DB trigger)
 * NOTE: source is optional but valuable for forensics
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

    if (event.kind.includes('_')) {
      return { success: false, error: `Event kind must not contain underscore: "${event.kind}"` };
    }

    // 2. Validate ISO 8601 format (basic check)
    try {
      const timestamp = new Date(event.at);
      if (isNaN(timestamp.getTime())) {
        return { success: false, error: 'Event "at" must be valid ISO 8601 timestamp' };
      }
    } catch {
      return { success: false, error: 'Event "at" must be valid ISO 8601 timestamp' };
    }

    // 3. IDEMPOTENCE: Check for duplicate anchor events before appending
    // Only for anchor events - check if same (witness_hash, network, anchor_stage, step_index) exists
    if (event.kind === 'anchor.confirmed' || event.kind === 'anchor.submitted' || event.kind === 'anchor.failed') {
      const anchorData = event.anchor;
      if (anchorData?.witness_hash && anchorData?.network) {
        const { data: entity, error: fetchError } = await supabase
          .from('document_entities')
          .select('events')
          .eq('id', documentEntityId)
          .single();

        if (!fetchError && entity?.events) {
          const existingEvents = entity.events as any[];
          const isDuplicate = existingEvents.some((e: any) => {
            if (e.kind !== event.kind) return false;
            const existingAnchor = e.anchor;
            if (!existingAnchor) return false;
            return (
              existingAnchor.witness_hash === anchorData.witness_hash &&
              existingAnchor.network === anchorData.network &&
              (existingAnchor.anchor_stage ?? 'initial') === (anchorData.anchor_stage ?? 'initial') &&
              (existingAnchor.step_index ?? 0) === (anchorData.step_index ?? 0)
            );
          });

          if (isDuplicate) {
            console.log(`[idempotence] Skipping duplicate ${event.kind} for ${anchorData.witness_hash}/${anchorData.network}`);
            return { success: true }; // Idempotent - already exists
          }
        }
      }
    }

    // 4. B1/B2/B3 validators for policy evolution events (fail-hard).
    if (event.kind === 'document.protected.requested') {
      const { data: entity, error: fetchError } = await supabase
        .from('document_entities')
        .select('events')
        .eq('id', documentEntityId)
        .single();

      if (fetchError) {
        return { success: false, error: `Failed to load previous events: ${fetchError.message}` };
      }

      const previousEvents = Array.isArray(entity?.events) ? (entity.events as GenericEvent[]) : [];
      validateRequiredEvidenceNotNull(event);
      validateMonotonicityByStage(event, previousEvents);
      validateMinimumEvidence(event);
    }

    const envelope = {
      ...event,
      id: isUuid(event.id) ? event.id : crypto.randomUUID(),
      v: typeof event.v === 'number' ? event.v : 1,
      actor: typeof event.actor === 'string' && event.actor.length > 0 ? event.actor : (source ?? 'unknown'),
      // Canonical invariants for document_entities events:
      // - entity_id is always the documentEntityId we are appending to
      // - correlation_id is always the documentEntityId (single-trace per entity)
      entity_id: documentEntityId,
      correlation_id: documentEntityId,
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
