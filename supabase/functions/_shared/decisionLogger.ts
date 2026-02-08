/**
 * Decision Logger for Executor
 *
 * Logs all executor decisions for auditability and debugging.
 * Each decision is tied to document state at decision time.
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2.42.0';

export interface DecisionLog {
  document_entity_id: string;
  policy_version: string;
  events_hash?: string;
  decision: string[]; // Array of job types decided
  reason: string;
  metadata?: Record<string, any>;
}

/**
 * Log an executor decision
 *
 * @param supabase - Supabase client (with service role key)
 * @param logData - Decision log data
 * @returns Success/error result
 */
export async function logExecutorDecision(
  supabase: SupabaseClient,
  logData: DecisionLog
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('executor_decision_logs')
      .insert({
        document_entity_id: logData.document_entity_id,
        policy_version: logData.policy_version,
        events_hash: logData.events_hash,
        decision: logData.decision,
        reason: logData.reason,
        metadata: logData.metadata || {},
      });

    if (error) {
      return {
        success: false,
        error: `Failed to log decision: ${error.message}`
      };
    }

    console.log(`✅ Decision logged: ${logData.reason} for document ${logData.document_entity_id}`);
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in logExecutorDecision:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message || 'unknown error'}`
    };
  }
}

/**
 * Calculate hash of events array for consistency verification
 * 
 * @param events - Array of events from document_entities
 * @returns SHA-256 hash as hex string
 */
export async function hashEvents(events: any[]): Promise<string> {
  try {
    // Normalize events to ensure consistent hashing
    const normalizedEvents = JSON.parse(JSON.stringify(events));
    const eventsJson = JSON.stringify(normalizedEvents.sort((a, b) => {
      // Sort by kind and at to ensure consistent order
      if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
      return (a.at || '').localeCompare(b.at || '');
    }));

    const encoder = new TextEncoder();
    const data = encoder.encode(eventsJson);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Error hashing events:', error);
    return '';
  }
}