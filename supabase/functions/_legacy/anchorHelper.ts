import { SupabaseClient } from 'npm:@supabase/supabase-js@2.42.0';
import type { AnchorNetwork } from '../_shared/anchorHelper.ts';

/**
 * Legacy anchor telemetry helpers
 *
 * These log to the legacy events table (document_id based).
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
        ...metadata,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // Non-critical: don't block anchoring process if logging fails
    console.warn('Failed to log anchor.attempt:', err);
  }
}

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
        ...metadata,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // Non-critical: don't block process if logging fails
    console.warn('Failed to log anchor.failed:', err);
  }
}
