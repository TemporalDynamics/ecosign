/**
 * TSA Helper for Edge Functions
 * 
 * This module provides utilities for edge functions to append TSA events
 * to document_entities.events[] following the canonical pattern.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type TsaEventPayload = {
  token_b64: string;
  witness_hash: string;
  gen_time?: string;
  policy_oid?: string;
  serial?: string;
  digest_algo?: string;
  tsa_cert_fingerprint?: string;
  token_hash?: string;
};

/**
 * Append TSA event to document_entities.events[]
 * 
 * MUST: witness_hash must match document_entities.witness_hash
 * MUST: token_b64 must be valid base64 RFC 3161 token
 * 
 * @param supabase - Supabase client (with service role key)
 * @param documentId - document_entities.id
 * @param payload - TSA event payload
 * @returns Success/error result
 */
export async function appendTsaEventFromEdge(
  supabase: SupabaseClient,
  documentId: string,
  payload: TsaEventPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Fetch current document entity
    const { data: entity, error: fetchError } = await supabase
      .from('document_entities')
      .select('id, witness_hash, events')
      .eq('id', documentId)
      .single();

    if (fetchError || !entity) {
      return { success: false, error: `Document not found: ${fetchError?.message}` };
    }

    // 2. Validate witness_hash consistency
    if (payload.witness_hash !== entity.witness_hash) {
      return {
        success: false,
        error: `TSA witness_hash mismatch: expected ${entity.witness_hash}, got ${payload.witness_hash}`
      };
    }

    // 3. Build TSA event
    const event = {
      kind: 'tsa',
      at: new Date().toISOString(),
      witness_hash: payload.witness_hash,
      tsa: {
        token_b64: payload.token_b64,
        gen_time: payload.gen_time,
        policy_oid: payload.policy_oid,
        serial: payload.serial,
        digest_algo: payload.digest_algo || 'sha256',
        tsa_cert_fingerprint: payload.tsa_cert_fingerprint,
        token_hash: payload.token_hash,
      },
    };

    // 4. Append to events[] (DB trigger will validate)
    const currentEvents = Array.isArray(entity.events) ? entity.events : [];
    const { error: updateError } = await supabase
      .from('document_entities')
      .update({
        events: [...currentEvents, event],
      })
      .eq('id', documentId);

    if (updateError) {
      return { success: false, error: `Failed to append TSA event: ${updateError.message}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Check if document already has TSA event
 * 
 * @param supabase - Supabase client
 * @param documentId - document_entities.id
 * @returns Boolean indicating TSA presence
 */
export async function hasTsaEvent(
  supabase: SupabaseClient,
  documentId: string
): Promise<boolean> {
  try {
    const { data: entity, error } = await supabase
      .from('document_entities')
      .select('events')
      .eq('id', documentId)
      .single();

    if (error || !entity) return false;

    const events = Array.isArray(entity.events) ? entity.events : [];
    return events.some((e: any) => e.kind === 'tsa');
  } catch {
    return false;
  }
}
