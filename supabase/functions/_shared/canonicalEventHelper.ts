import { SupabaseClient } from 'npm:@supabase/supabase-js@2.42.0';

const CANONICAL_EVENT_TYPES = new Set([
  'workflow.created',
  'workflow.activated',
  'workflow.completed',
  'workflow.cancelled',
  'signer.invited',
  'signer.accessed',
  'signer.identity_confirmed',
  'signer.ready_to_sign',
  'signer.signed',
  'signer.cancelled',
  'signer.rejected',
  'otp.sent',
  'otp.verified',
  'document.change_requested',
  'document.change_resolved',
  'document.decrypted',
  'signature.applied',
  'signature.capture.consent',
  'fields.schema.committed',
  'signature.state.committed',
  'eco.snapshot.issued'
]);

export type CanonicalEventType =
  | 'workflow.created'
  | 'workflow.activated'
  | 'workflow.completed'
  | 'workflow.cancelled'
  | 'signer.invited'
  | 'signer.accessed'
  | 'signer.identity_confirmed'
  | 'signer.ready_to_sign'
  | 'signer.signed'
  | 'signer.cancelled'
  | 'signer.rejected'
  | 'otp.sent'
  | 'otp.verified'
  | 'document.change_requested'
  | 'document.change_resolved'
  | 'document.decrypted'
  | 'signature.applied'
  | 'signature.capture.consent'
  | 'fields.schema.committed'
  | 'signature.state.committed'
  | 'eco.snapshot.issued';

type AppendEventParams = {
  event_type: CanonicalEventType;
  workflow_id: string;
  signer_id?: string | null;
  payload?: Record<string, unknown>;
  actor_id?: string | null;
};

export async function appendEvent(
  supabase: SupabaseClient,
  params: AppendEventParams,
  source?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!CANONICAL_EVENT_TYPES.has(params.event_type)) {
      return { success: false, error: `Invalid canonical event: ${params.event_type}` };
    }

    const payload = source
      ? { ...(params.payload || {}), _source: source }
      : (params.payload || {});

    const { error } = await supabase
      .from('workflow_events')
      .insert({
        workflow_id: params.workflow_id,
        signer_id: params.signer_id ?? null,
        event_type: params.event_type,
        payload,
        actor_id: params.actor_id ?? null
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('appendEvent canonical error', error);
    return {
      success: false,
      error: `Unexpected error: ${error?.message || 'unknown'}`
    };
  }
}
