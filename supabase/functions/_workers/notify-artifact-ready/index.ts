/**
 * FASE C2 — notify-artifact-ready Worker
 * 
 * Purpose:
 * Listen to workflow.artifact_finalized events and notify participants.
 * 
 * Responsibilities:
 * - Resolve workflow participants (owner + signers)
 * - Queue notification emails
 * - Update UI state (if applicable)
 * 
 * What this worker MUST NOT do:
 * - Reconstruct artifacts
 * - Verify hashes
 * - Mutate workflow state
 * - Emit other events
 * 
 * Contract: FASE C2 (FINAL_ARTIFACT_IMPLEMENTATION_ROADMAP.md)
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ArtifactFinalizedPayload {
  workflow_id: string;
  artifact_id: string;
  artifact_hash: string;
  artifact_url: string;
  finalized_at: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse event payload
    const event = await req.json();
    
    if (event.type !== 'workflow.artifact_finalized') {
      return new Response('Event type not supported', { status: 400 });
    }

    const payload: ArtifactFinalizedPayload = event.payload;
    const { workflow_id, artifact_url, artifact_hash } = payload;

    console.log(`[C2] Processing artifact notification for workflow: ${workflow_id}`);

    // Step 1: Resolve workflow participants
    const { data: workflow, error: workflowError } = await supabase
      .from('signature_workflows')
      .select(`
        id,
        owner_user_id,
        document_entity_id,
        workflow_signers (
          id,
          email,
          full_name
        )
      `)
      .eq('id', workflow_id)
      .single();

    if (workflowError || !workflow) {
      console.error('[C2] Failed to resolve workflow:', workflowError);
      return new Response('Workflow not found', { status: 404 });
    }

    // Step 2: Resolve owner email
    const { data: owner } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('user_id', workflow.owner_user_id)
      .single();

    // Step 3: Queue notifications for owner
    if (owner?.email) {
      await supabase.from('workflow_notifications').insert({
        workflow_id,
        recipient_email: owner.email,
        notification_type: 'artifact_ready',
        subject: 'Tu documento firmado está listo',
        payload: {
          artifact_url,
          artifact_hash,
          download_url: artifact_url,
        },
      });

      console.log(`[C2] Queued notification for owner: ${owner.email}`);
    }

    // Step 4: Queue notifications for signers
    if (workflow.workflow_signers && workflow.workflow_signers.length > 0) {
      const signerNotifications = workflow.workflow_signers.map((signer: any) => ({
        workflow_id,
        signer_id: signer.id,
        recipient_email: signer.email,
        notification_type: 'artifact_ready',
        subject: 'Documento firmado disponible',
        payload: {
          artifact_url,
          artifact_hash,
          signer_name: signer.full_name,
        },
      }));

      await supabase.from('workflow_notifications').insert(signerNotifications);

      console.log(`[C2] Queued ${signerNotifications.length} notifications for signers`);
    }

    // Step 5: Optional - Trigger real-time UI update
    // (Not required for FASE C2, but can be added later)

    console.log(`[C2] Notification completed for workflow: ${workflow_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        workflow_id,
        notifications_queued: 1 + (workflow.workflow_signers?.length || 0),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[C2] Error processing notification:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
