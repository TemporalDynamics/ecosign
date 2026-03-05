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
import { normalizeEmail } from '../../_shared/email.ts';
import { requireInternalAuth } from '../../_shared/internalAuth.ts';

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
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204 });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const auth = requireInternalAuth(req, { allowCronSecret: true });
  if (!auth.ok) {
    return new Response('Forbidden', { status: 403 });
  }

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
        owner_id,
        document_entity_id,
        original_filename,
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
    const { data: ownerResult, error: ownerError } = await supabase.auth.admin.getUserById(workflow.owner_id);
    const ownerEmail = normalizeEmail(ownerResult?.user?.email ?? null);
    if (ownerError || !ownerEmail) {
      console.warn('[C2] Missing owner email, skipping owner notification', {
        workflow_id,
        owner_id: workflow.owner_id,
        error: ownerError?.message,
      });
    }

    // Step 3: Queue notifications for owner
    const appUrl = Deno.env.get('APP_URL') || 'https://app.ecosign.app';
    const workflowUrl = `${appUrl}/workflows/${workflow_id}`;
    const documentName = workflow.original_filename || 'tu documento';

    if (ownerEmail) {
      await supabase.from('workflow_notifications').upsert({
        workflow_id,
        recipient_email: ownerEmail,
        recipient_type: 'owner',
        notification_type: 'artifact_ready',
        subject: `Documento listo: ${documentName}`,
        body_html: `
          <h2 style="font-family:Arial,sans-serif;color:#0f172a;margin:0 0 16px;">Tu documento certificado está listo</h2>
          <p style="font-family:Arial,sans-serif;color:#334155;margin:0 0 12px;">
            El documento <strong>${documentName}</strong> ha sido firmado por todos los participantes y el certificado final está disponible.
          </p>
          <p style="font-family:Arial,sans-serif;color:#334155;margin:0 0 20px;">
            El artefacto incluye todas las firmas, timestamps y evidencia forense en un único archivo verificable.
          </p>
          <p style="font-family:Arial,sans-serif;margin:0 0 16px;">
            <a href="${workflowUrl}" style="display:inline-block;padding:14px 24px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">
              Descargar certificado
            </a>
          </p>
          <p style="font-family:Arial,sans-serif;color:#64748b;font-size:13px;margin:16px 0 0;">
            Hash del artefacto: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${artifact_hash?.substring(0, 16)}...</code>
          </p>
          <p style="font-family:Arial,sans-serif;color:#0f172a;font-weight:600;margin:20px 0 0;">
            EcoSign. Transparencia que acompaña.
          </p>
        `,
        delivery_status: 'pending',
        step: 'primary',
      }, {
        onConflict: 'workflow_id,recipient_email,notification_type,step',
        ignoreDuplicates: true,
      });

      console.log(`[C2] Queued notification for owner: ${ownerEmail}`);
    }

    // Step 4: Queue notifications for signers
    if (workflow.workflow_signers && workflow.workflow_signers.length > 0) {
      const signerNotifications = workflow.workflow_signers
        .map((signer: any) => {
          const email = normalizeEmail(signer?.email ?? null);
          if (!email) return null;
          const signerName = signer.full_name || 'Hola';
          return {
            workflow_id,
            signer_id: signer.id,
            recipient_email: email,
            recipient_type: 'signer',
            notification_type: 'artifact_ready',
            subject: `Documento firmado disponible: ${documentName}`,
            body_html: `
              <h2 style="font-family:Arial,sans-serif;color:#0f172a;margin:0 0 16px;">Tu copia firmada está lista</h2>
              <p style="font-family:Arial,sans-serif;color:#334155;margin:0 0 12px;">
                Hola ${signerName}, el documento <strong>${documentName}</strong> ya está finalizado.
              </p>
              <p style="font-family:Arial,sans-serif;color:#334155;margin:0 0 20px;">
                Podés descargar el certificado final desde tu panel.
              </p>
              <p style="font-family:Arial,sans-serif;margin:0 0 16px;">
                <a href="${workflowUrl}" style="display:inline-block;padding:14px 24px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">
                  Abrir documento
                </a>
              </p>
              <p style="font-family:Arial,sans-serif;color:#64748b;font-size:13px;margin:16px 0 0;">
                Hash del artefacto: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${artifact_hash?.substring(0, 16)}...</code>
              </p>
            `,
            delivery_status: 'pending',
            step: 'primary',
          };
        })
        .filter(Boolean);

      if (signerNotifications.length > 0) {
        await supabase.from('workflow_notifications').upsert(signerNotifications, {
          onConflict: 'workflow_id,recipient_email,notification_type,step',
          ignoreDuplicates: true,
        });
      }

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
