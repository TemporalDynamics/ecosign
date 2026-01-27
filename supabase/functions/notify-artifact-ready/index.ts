/**
 * FASE C2 — Worker: notify-artifact-ready
 *
 * Purpose: Notify users when their workflow artifact is ready for download
 * Contract: docs/contratos/CONTRATO_ARTEFACTO_FINAL.md (C2)
 *
 * Responsibilities:
 * - Find ready artifacts without notifications sent
 * - Send notification to workflow owner
 * - Use workflow_notifications for idempotency
 * - Trigger email delivery
 *
 * Does NOT:
 * - Mutate artifact
 * - Recalculate hashes
 * - Change workflow status
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOTIFICATION_TYPE = 'artifact_ready';

const requireCronSecret = (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  const provided = req.headers.get('x-cron-secret') ?? '';
  if (!cronSecret || provided !== cronSecret) {
    return new Response('Forbidden', { status: 403, headers: corsHeaders });
  }
  return null;
};

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authError = requireCronSecret(req);
  if (authError) return authError;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('[notify-artifact-ready] Worker started');

    const appUrl = Deno.env.get('APP_URL') || 'https://app.ecosign.app';

    // Find ready artifacts that haven't been notified
    // We check by looking for artifacts with status='ready' that don't have
    // a corresponding workflow_notification of type 'artifact_ready'
    const { data: readyArtifacts, error: queryError } = await supabaseClient
      .from('workflow_artifacts')
      .select(`
        id,
        workflow_id,
        artifact_id,
        artifact_hash,
        artifact_url,
        finalized_at,
        workflow:signature_workflows (
          id,
          owner_id,
          original_filename,
          document_entity_id
        )
      `)
      .eq('status', 'ready')
      .limit(10);

    if (queryError) {
      console.error('[notify-artifact-ready] Query error:', queryError);
      throw queryError;
    }

    if (!readyArtifacts || readyArtifacts.length === 0) {
      console.log('[notify-artifact-ready] No ready artifacts found');
      return new Response(
        JSON.stringify({ processed: 0, message: 'No artifacts to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`[notify-artifact-ready] Found ${readyArtifacts.length} ready artifacts`);

    const results = [];

    for (const artifact of readyArtifacts) {
      try {
        const workflow = artifact.workflow as any;
        if (!workflow) {
          console.warn(`[notify-artifact-ready] No workflow found for artifact: ${artifact.id}`);
          results.push({ artifact_id: artifact.id, status: 'skipped', reason: 'no_workflow' });
          continue;
        }

        // Check if notification already sent (idempotency via workflow_notifications)
        const { data: existingNotification } = await supabaseClient
          .from('workflow_notifications')
          .select('id')
          .eq('workflow_id', artifact.workflow_id)
          .eq('notification_type', NOTIFICATION_TYPE)
          .single();

        if (existingNotification) {
          console.log(`[notify-artifact-ready] Notification already sent for workflow: ${artifact.workflow_id}`);
          results.push({ artifact_id: artifact.id, status: 'skipped', reason: 'already_notified' });
          continue;
        }

        // Get owner email
        const { data: ownerData } = await supabaseClient
          .from('auth.users')
          .select('email')
          .eq('id', workflow.owner_id)
          .single();

        const ownerEmail = ownerData?.email;

        if (!ownerEmail) {
          console.warn(`[notify-artifact-ready] No owner email for workflow: ${artifact.workflow_id}`);
          results.push({ artifact_id: artifact.id, status: 'skipped', reason: 'no_owner_email' });
          continue;
        }

        // Create notification for owner
        const workflowUrl = `${appUrl}/workflows/${artifact.workflow_id}`;
        const documentName = workflow.original_filename || 'tu documento';

        const { error: notifyError } = await supabaseClient
          .from('workflow_notifications')
          .insert({
            workflow_id: artifact.workflow_id,
            recipient_email: ownerEmail,
            recipient_type: 'owner',
            notification_type: NOTIFICATION_TYPE,
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
                Hash del artefacto: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${artifact.artifact_hash?.substring(0, 16)}...</code>
              </p>
              <p style="font-family:Arial,sans-serif;color:#0f172a;font-weight:600;margin:20px 0 0;">
                EcoSign. Transparencia que acompaña.
              </p>
            `,
            delivery_status: 'pending',
            notification_step: 'artifact_ready'
          });

        if (notifyError) {
          console.error(`[notify-artifact-ready] Failed to create notification: ${notifyError.message}`);
          results.push({ artifact_id: artifact.id, status: 'failed', error: notifyError.message });
          continue;
        }

        console.log(`[notify-artifact-ready] ✅ Notification created for workflow: ${artifact.workflow_id}`);
        results.push({ artifact_id: artifact.id, workflow_id: artifact.workflow_id, status: 'success' });

      } catch (artifactError) {
        console.error(`[notify-artifact-ready] Error processing artifact ${artifact.id}:`, artifactError);
        results.push({ artifact_id: artifact.id, status: 'error', error: String(artifactError) });
      }
    }

    // Trigger email delivery if we created any notifications
    const successCount = results.filter(r => r.status === 'success').length;
    if (successCount > 0) {
      try {
        const cronSecret = Deno.env.get('CRON_SECRET')
        if (!cronSecret) {
          console.warn('[notify-artifact-ready] send-pending-emails skipped: missing CRON_SECRET')
        } else {
          await supabaseClient.functions.invoke('send-pending-emails', {
            headers: { 'x-cron-secret': cronSecret }
          });
          console.log('[notify-artifact-ready] Triggered email delivery');
        }
      } catch (emailError) {
        console.warn('[notify-artifact-ready] Failed to trigger email delivery:', emailError);
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        notified: successCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[notify-artifact-ready] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
