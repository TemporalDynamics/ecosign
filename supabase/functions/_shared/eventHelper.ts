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

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type GenericEvent = {
  kind: string;
  at: string; // ISO 8601 timestamp
  [key: string]: any; // Contextual data specific to event kind
};

/**
 * Append any event to document_entities.events[]
 *
 * MUST: event.kind must be present
 * MUST: event.at must be ISO 8601 timestamp
 * MUST: events[] is append-only (enforced by DB trigger)
 *
 * @param supabase - Supabase client (with service role key)
 * @param documentEntityId - document_entities.id
 * @param event - Event object with kind, at, and contextual data
 * @param source - Optional: edge function name for forensics (not shown to user)
 * @returns Success/error result
 */
export async function appendEvent(
  supabase: SupabaseClient,
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

    // Validate ISO 8601 format (basic check)
    try {
      const timestamp = new Date(event.at);
      if (isNaN(timestamp.getTime())) {
        return { success: false, error: 'Event "at" must be valid ISO 8601 timestamp' };
      }
    } catch {
      return { success: false, error: 'Event "at" must be valid ISO 8601 timestamp' };
    }

    const { error: rpcError } = await supabase.rpc('append_document_entity_event', {
      p_document_entity_id: documentEntityId,
      p_event: event,
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
    return {
      success: false,
      error: `Unexpected error: ${error.message || 'unknown error'}`
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
  supabase: SupabaseClient,
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
  supabase: SupabaseClient,
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
