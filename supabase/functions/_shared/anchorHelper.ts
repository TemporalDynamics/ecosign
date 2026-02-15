/**
 * Anchor Helper for Edge Functions
 *
 * This module provides utilities for edge functions to append anchor events
 * to document_entities.events[] following the canonical pattern.
 *
 * Contract: docs/contratos/ANCHOR_EVENT_RULES.md
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2.42.0';
import { appendEvent } from './eventHelper.ts';

// Closed enum: only these networks are valid
export type AnchorNetwork = 'polygon' | 'bitcoin';

export type AnchorEventPayload = {
  network: AnchorNetwork;
  witness_hash: string;
  txid: string;
  block_height?: number;
  confirmed_at: string;
};

/**
 * Append anchor event to document_entities.events[]
 *
 * MUST: witness_hash must match document_entities.witness_hash
 * MUST: network must be 'polygon' | 'bitcoin'
 * MUST: Only one anchor per network (idempotent)
 *
 * Contract rules:
 * - Append-only (never edit/delete)
 * - Uniqueness: max 1 anchor per network
 * - Idempotence: same network + txid = silent ignore
 * - Monotonic: protection level only increases
 *
 * @param supabase - Supabase client (with service role key)
 * @param documentId - document_entities.id
 * @param payload - Anchor event payload
 * @returns Success/error result
 */
export async function appendAnchorEventFromEdge(
  supabase: SupabaseClient,
  documentId: string,
  payload: AnchorEventPayload,
  source?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!source) {
      return {
        success: false,
        error: 'Missing source for canonical anchor event (required)'
      };
    }

    // 1. Validate network (closed enum)
    if (!['polygon', 'bitcoin'].includes(payload.network)) {
      return {
        success: false,
        error: `Invalid network: ${payload.network}. Must be 'polygon' or 'bitcoin'`
      };
    }

    // 2. Fetch current document entity
    const { data: entity, error: fetchError } = await supabase
      .from('document_entities')
      .select('id, witness_hash, events')
      .eq('id', documentId)
      .single();

    if (fetchError || !entity) {
      return { success: false, error: `Document not found: ${fetchError?.message}` };
    }

    // 3. Validate witness_hash consistency (CRITICAL)
    if (payload.witness_hash !== entity.witness_hash) {
      return {
        success: false,
        error: `Anchor witness_hash mismatch: expected ${entity.witness_hash}, got ${payload.witness_hash}`
      };
    }

    const currentEvents = Array.isArray(entity.events) ? entity.events : [];

    // 4. Check uniqueness: max 1 anchor per network
    const existingAnchor = currentEvents.find(
      (e: any) => e.kind === 'anchor' && e.anchor?.network === payload.network
    );

    if (existingAnchor) {
      // Idempotence: if same txid, silently succeed (retry safety)
      if (existingAnchor.anchor?.txid === payload.txid) {
        return { success: true }; // Already registered, no-op
      }

      // Different txid = violation of uniqueness constraint
      return {
        success: false,
        error: `Anchor already exists for network ${payload.network}. Only one anchor per network allowed.`
      };
    }

    // 5. Build anchor event (canonical structure)
    const event = {
      kind: 'anchor',
      at: new Date().toISOString(),
      anchor: {
        network: payload.network,
        witness_hash: payload.witness_hash,
        txid: payload.txid,
        ...(payload.block_height !== undefined && { block_height: payload.block_height }),
        confirmed_at: payload.confirmed_at,
      },
    };

    const result = await appendEvent(supabase as any, documentId, event as any, source);
    if (!result.success) {
      return { success: false, error: result.error ?? 'Failed to append anchor event' };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Check if document already has anchor for specific network
 *
 * @param supabase - Supabase client
 * @param documentId - document_entities.id
 * @param network - 'polygon' | 'bitcoin'
 * @returns Boolean indicating anchor presence
 */
export async function hasAnchorEvent(
  supabase: SupabaseClient,
  documentId: string,
  network: AnchorNetwork
): Promise<boolean> {
  try {
    const { data: entity, error } = await supabase
      .from('document_entities')
      .select('events')
      .eq('id', documentId)
      .single();

    if (error || !entity) return false;

    const events = Array.isArray(entity.events) ? entity.events : [];
    return events.some(
      (e: any) => e.kind === 'anchor' && e.anchor?.network === network
    );
  } catch {
    return false;
  }
}

/**
 * Get anchor event for specific network (if exists)
 *
 * @param supabase - Supabase client
 * @param documentId - document_entities.id
 * @param network - 'polygon' | 'bitcoin'
 * @returns Anchor event or null
 */
export async function getAnchorEvent(
  supabase: SupabaseClient,
  documentId: string,
  network: AnchorNetwork
): Promise<any | null> {
  try {
    const { data: entity, error } = await supabase
      .from('document_entities')
      .select('events')
      .eq('id', documentId)
      .single();

    if (error || !entity) return null;

    const events = Array.isArray(entity.events) ? entity.events : [];
    return events.find(
      (e: any) => e.kind === 'anchor' && e.anchor?.network === network
    ) || null;
  } catch {
    return null;
  }
}

/**
 * Derive protection level from events
 *
 * This is a reference implementation for deriving protection level.
 * The actual derivation should happen via DB trigger or client-side.
 *
 * Levels:
 * - NONE: No protection
 * - TSA_CONFIRMED: TSA confirmed
 * - TSA_REKOR_CONFIRMED: TSA + Rekor confirmed
 * - ONE_CHAIN_CONFIRMED: TSA + Rekor + one chain confirmed
 * - TWO_CHAINS_CONFIRMED: TSA + Rekor + both chains confirmed
 *
 * @param events - Array of events from document_entities
 * @returns Protection level string
 */
export function deriveProtectionLevel(events: any[]): string {
  const hasTsa = events.some((e: any) => e.kind === 'tsa.confirmed');
  const hasRekor = events.some((e: any) => e.kind === 'rekor.confirmed');
  const hasPolygon = events.some(
    (e: any) => (e.kind === 'anchor' || e.kind === 'anchor.confirmed')
      && ((e.anchor?.network === 'polygon') || (e.payload?.network === 'polygon'))
  );
  const hasBitcoin = events.some(
    (e: any) => (e.kind === 'anchor' || e.kind === 'anchor.confirmed')
      && ((e.anchor?.network === 'bitcoin') || (e.payload?.network === 'bitcoin'))
  );

  if (hasBitcoin && hasPolygon && hasTsa && hasRekor) return 'TWO_CHAINS_CONFIRMED';
  if ((hasPolygon || hasBitcoin) && hasTsa && hasRekor) return 'ONE_CHAIN_CONFIRMED';
  if (hasTsa && hasRekor) return 'TSA_REKOR_CONFIRMED';
  if (hasTsa) return 'TSA_CONFIRMED';
  return 'NONE';
}

/**
 * WORKSTREAM 3: Observable Anchoring Events
 *
 * These helpers log observability events to the `events` table (legacy).
 * Unlike canonical anchor events (in document_entities.events[]),
 * these are for operational visibility:
 * - anchor.attempt: When anchoring process starts
 * - anchor.failed: When anchoring fails terminally
 *
 * Philosophy: "UI refleja, no afirma"
 * - NO optimistic UI
 * - Every attempt is logged
 * - Every failure is logged
 * - Only confirmed anchors go to canonical events[]
 */

/**
 * Log anchor attempt (observability event)
 *
 * Called at START of anchoring process, before sending tx.
 * Creates audit trail of all attempts (including retries).
 *
 * @param supabase - Supabase client
 * @param userDocumentId - user_documents.id (legacy)
 * @param network - 'polygon' | 'bitcoin'
 * @param witnessHash - Hash being anchored
 * @param metadata - Additional context (txHash if available, etc)
 */
export async function logAnchorAttempt(
  supabase: SupabaseClient,
  userDocumentId: string,
  network: AnchorNetwork,
  witnessHash: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabase.from('events').insert({
      event_type: 'anchor.attempt',
      document_id: userDocumentId,
      metadata: {
        network,
        witness_hash: witnessHash,
        status: 'pending',
        attempted_at: new Date().toISOString(),
        ...metadata
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    // Non-critical: don't block anchoring process if logging fails
    console.warn('Failed to log anchor.attempt:', err);
  }
}

/**
 * Log anchor failure (observability event)
 *
 * Called when anchoring fails terminally (max retries, tx reverted, etc).
 * Creates audit trail of what went wrong.
 *
 * @param supabase - Supabase client
 * @param userDocumentId - user_documents.id (legacy)
 * @param network - 'polygon' | 'bitcoin'
 * @param witnessHash - Hash that failed to anchor
 * @param errorMessage - Why it failed
 * @param attempts - Number of attempts made
 * @param metadata - Additional context
 */
export async function logAnchorFailed(
  supabase: SupabaseClient,
  userDocumentId: string,
  network: AnchorNetwork,
  witnessHash: string,
  errorMessage: string,
  attempts: number,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabase.from('events').insert({
      event_type: 'anchor.failed',
      document_id: userDocumentId,
      metadata: {
        network,
        witness_hash: witnessHash,
        status: 'failed',
        error_message: errorMessage,
        attempts,
        failed_at: new Date().toISOString(),
        ...metadata
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    // Non-critical: don't block process if logging fails
    console.warn('Failed to log anchor.failed:', err);
  }
}
