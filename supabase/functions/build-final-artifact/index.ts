/**
 * FASE C1 — Worker: build-final-artifact
 * 
 * Purpose: Convert completed workflows into final, immutable, verifiable artifacts
 * Contract: docs/contratos/CONTRATO_ARTEFACTO_FINAL.md
 * 
 * Responsibilities:
 * - Detect completed workflows without artifacts
 * - Lock artifact record (idempotency)
 * - Assemble signed PDF + evidence sheet
 * - Persist artifact to storage
 * - Emit workflow.artifact_finalized event
 * 
 * Does NOT:
 * - Change workflow status
 * - Notify users (that's C2)
 * - Emit other events
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { buildArtifact } from '../_shared/artifactBuilder.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

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

    console.log('[build-final-artifact] Worker started');

    // C1.2 — Query: Find workflows that need artifacts
    const { data: pendingWorkflows, error: queryError } = await supabaseClient
      .from('signature_workflows')
      .select(`
        id,
        document_entity_id,
        status
      `)
      .eq('status', 'completed')
      .is('artifact_id', null) // Workflows without artifact reference
      .limit(10); // Process in batches

    if (queryError) {
      console.error('[build-final-artifact] Query error:', queryError);
      throw queryError;
    }

    if (!pendingWorkflows || pendingWorkflows.length === 0) {
      console.log('[build-final-artifact] No pending workflows found');
      return new Response(
        JSON.stringify({ processed: 0, message: 'No workflows to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`[build-final-artifact] Found ${pendingWorkflows.length} workflows to process`);

    const results = [];

    for (const workflow of pendingWorkflows) {
      try {
        console.log(`[build-final-artifact] Processing workflow: ${workflow.id}`);

        // C1.3 — Lock: Acquire logical lock via workflow_artifacts
        const { data: existingArtifact } = await supabaseClient
          .from('workflow_artifacts')
          .select('id, status')
          .eq('workflow_id', workflow.id)
          .single();

        let artifactRecord;

        if (!existingArtifact) {
          // Create new artifact record with lock
          const { data: newArtifact, error: insertError } = await supabaseClient
            .from('workflow_artifacts')
            .insert({
              workflow_id: workflow.id,
              status: 'building',
              build_attempts: 1,
            })
            .select()
            .single();

          if (insertError) {
            console.error(`[build-final-artifact] Failed to create artifact record: ${insertError.message}`);
            results.push({ workflow_id: workflow.id, status: 'failed', error: insertError.message });
            continue;
          }

          artifactRecord = newArtifact;
        } else if (existingArtifact.status === 'pending' || existingArtifact.status === 'failed') {
          // Acquire lock on existing record
          const { data: lockedArtifact, error: lockError } = await supabaseClient
            .from('workflow_artifacts')
            .update({
              status: 'building',
              build_attempts: supabaseClient.rpc('increment_attempts', { artifact_id: existingArtifact.id }),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingArtifact.id)
            .eq('status', existingArtifact.status) // Optimistic lock
            .select()
            .single();

          if (lockError || !lockedArtifact) {
            console.log(`[build-final-artifact] Failed to acquire lock (another worker won): ${workflow.id}`);
            results.push({ workflow_id: workflow.id, status: 'skipped', reason: 'lock_not_acquired' });
            continue;
          }

          artifactRecord = lockedArtifact;
        } else {
          console.log(`[build-final-artifact] Workflow already processed (status: ${existingArtifact.status}): ${workflow.id}`);
          results.push({ workflow_id: workflow.id, status: 'skipped', reason: 'already_processed' });
          continue;
        }

        console.log(`[build-final-artifact] Lock acquired for workflow: ${workflow.id}, artifact: ${artifactRecord.id}`);

        // C1.4 — Build artifact
        const artifactResult = await buildArtifact(supabaseClient, workflow, artifactRecord.id);

        if (!artifactResult.success) {
          // Mark as failed
          await supabaseClient
            .from('workflow_artifacts')
            .update({
              status: 'failed',
              last_error: artifactResult.error,
              updated_at: new Date().toISOString(),
            })
            .eq('id', artifactRecord.id);

          results.push({ workflow_id: workflow.id, status: 'failed', error: artifactResult.error });
          continue;
        }

        // C1.5 — Persist: Mark as ready
        const { error: finalizeError } = await supabaseClient
          .from('workflow_artifacts')
          .update({
            status: 'ready',
            artifact_id: artifactResult.artifactId,
            artifact_hash: artifactResult.hash,
            artifact_url: artifactResult.url,
            finalized_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', artifactRecord.id);

        if (finalizeError) {
          console.error(`[build-final-artifact] Failed to finalize artifact: ${finalizeError.message}`);
          results.push({ workflow_id: workflow.id, status: 'failed', error: finalizeError.message });
          continue;
        }

        // C1.6 — Emit event: workflow.artifact_finalized (B2 contract)
        const { error: eventError } = await supabaseClient
          .from('workflow_events')
          .insert({
            workflow_id: workflow.id,
            event_type: 'workflow.artifact_finalized',
            payload: {
              workflow_id: workflow.id,
              artifact_id: artifactResult.artifactId,
              artifact_hash: artifactResult.hash,
              artifact_url: artifactResult.url,
              finalized_at: new Date().toISOString(),
            },
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (eventError) {
          console.error(`[build-final-artifact] Failed to emit event (non-fatal): ${eventError.message}`);
          // Non-blocking: artifact is still valid
        }

        console.log(`[build-final-artifact] ✅ Artifact finalized for workflow: ${workflow.id}`);
        results.push({ workflow_id: workflow.id, status: 'success', artifact_id: artifactResult.artifactId });

      } catch (workflowError) {
        console.error(`[build-final-artifact] Error processing workflow ${workflow.id}:`, workflowError);
        results.push({ workflow_id: workflow.id, status: 'error', error: String(workflowError) });
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[build-final-artifact] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
