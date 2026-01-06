/**
 * Anchor Helper for Edge Functions
 *
 * This module provides utilities for edge functions to append anchor events
 * to document_entities.events[] following the canonical pattern.
 *
 * Contract: docs/contratos/ANCHOR_EVENT_RULES.md
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  payload: AnchorEventPayload
): Promise<{ success: boolean; error?: string }> {
  try {
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

    // 6. Append to events[] (DB trigger will handle derivations)
    const { error: updateError } = await supabase
      .from('document_entities')
      .update({
        events: [...currentEvents, event],
      })
      .eq('id', documentId);

    if (updateError) {
      return { success: false, error: `Failed to append anchor event: ${updateError.message}` };
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
 * - ACTIVE: TSA confirmed
 * - REINFORCED: TSA + Polygon confirmed
 * - TOTAL: TSA + Polygon + Bitcoin confirmed
 *
 * @param events - Array of events from document_entities
 * @returns Protection level string
 */
export function deriveProtectionLevel(events: any[]): string {
  const hasTsa = events.some((e: any) => e.kind === 'tsa');
  const hasPolygon = events.some(
    (e: any) => e.kind === 'anchor' && e.anchor?.network === 'polygon'
  );
  const hasBitcoin = events.some(
    (e: any) => e.kind === 'anchor' && e.anchor?.network === 'bitcoin'
  );

  // Monotonic progression: can only go up
  if (hasBitcoin && hasPolygon && hasTsa) return 'TOTAL';
  if (hasPolygon && hasTsa) return 'REINFORCED';
  if (hasTsa) return 'ACTIVE';
  return 'NONE';
}
