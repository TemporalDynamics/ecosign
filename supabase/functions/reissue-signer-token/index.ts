/**
 * P0.4a — reissue-signer-token
 *
 * Purpose: Allow workflow owner to regenerate a signer's access token
 *
 * Use cases:
 * - Token expired
 * - Token revoked
 * - Owner wants to resend link
 *
 * Rules:
 * - Reissue ONLY if workflow is active
 * - Reissue ONLY if signer NOT in terminal state (signed, cancelled, rejected, expired)
 * - Requester MUST be workflow owner
 *
 * Effects:
 * - Revokes previous token (token_revoked_at = now)
 * - Generates new token + hash + ciphertext
 * - Sets new expiration (7 days)
 * - Does NOT change signer_id or signing_order
 *
 * Important: Reissue is an explicit owner action, not automatic retry.
 */

import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import {
  generateSecretToken,
  createTokenHash,
  encryptToken,
} from '../_shared/cryptoHelper.ts';
import { appendEvent as appendCanonicalEvent } from '../_shared/canonicalEventHelper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ReissueRequest {
  workflowId: string;
  signerId: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const TOKEN_LIFETIME_DAYS = 7;

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate requester
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization' }, 401);
    }

    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized', details: userError?.message }, 401);
    }

    const body: ReissueRequest = await req.json();
    const { workflowId, signerId } = body;

    if (!workflowId || !signerId) {
      return json({ error: 'Missing workflowId or signerId' }, 400);
    }

    console.log('[reissue-signer-token] Request:', { workflowId, signerId, userId: user.id });

    // GATE 1: Verify workflow exists and user is owner
    const { data: workflow, error: wfError } = await supabase
      .from('signature_workflows')
      .select('id, owner_id, status')
      .eq('id', workflowId)
      .single();

    if (wfError || !workflow) {
      console.error('[reissue-signer-token] Workflow not found:', wfError);
      return json({ error: 'Workflow not found' }, 404);
    }

    if (workflow.owner_id !== user.id) {
      console.warn('[reissue-signer-token] Unauthorized: user is not owner', {
        userId: user.id,
        ownerId: workflow.owner_id,
      });
      return json({ error: 'Only the workflow owner can reissue tokens' }, 403);
    }

    // GATE 2: Verify workflow is active
    const activeStatuses = ['active'];
    if (!activeStatuses.includes(workflow.status)) {
      console.warn('[reissue-signer-token] Workflow not active:', workflow.status);
      return json({
        error: `Cannot reissue token: workflow status is "${workflow.status}"`,
        hint: 'Tokens can only be reissued for active workflows',
      }, 400);
    }

    // GATE 3: Verify signer exists and belongs to workflow
    const { data: signer, error: signerError } = await supabase
      .from('workflow_signers')
      .select('id, email, name, status, signing_order, access_token_hash')
      .eq('id', signerId)
      .eq('workflow_id', workflowId)
      .single();

    if (signerError || !signer) {
      console.error('[reissue-signer-token] Signer not found:', signerError);
      return json({ error: 'Signer not found in this workflow' }, 404);
    }

    // GATE 4: Verify signer is not in terminal state
    const terminalStates = ['signed', 'cancelled', 'rejected'];
    if (terminalStates.includes(signer.status)) {
      console.warn('[reissue-signer-token] Signer in terminal state:', signer.status);
      return json({
        error: `Cannot reissue token: signer has already "${signer.status}"`,
        hint: 'Tokens cannot be reissued for signers who have completed, cancelled, or rejected',
      }, 400);
    }

    // All gates passed. Generate new token.
    console.log('[reissue-signer-token] Gates passed, generating new token');

    const newToken = await generateSecretToken();
    const newTokenHash = await createTokenHash(newToken);
    const { ciphertext, nonce } = await encryptToken(newToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_LIFETIME_DAYS);

    // Update signer: revoke old token, set new token
    const { error: updateError } = await supabase
      .from('workflow_signers')
      .update({
        token_revoked_at: new Date().toISOString(), // Revoke previous token
        access_token_hash: newTokenHash,
        access_token_ciphertext: ciphertext,
        access_token_nonce: nonce,
        token_expires_at: expiresAt.toISOString(),
        // Reset status to invited/ready if it was expired
        status: signer.status === 'expired' ? 'invited' : signer.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', signerId);

    if (updateError) {
      console.error('[reissue-signer-token] Failed to update signer:', updateError);
      return json({ error: 'Failed to reissue token', details: updateError.message }, 500);
    }

    // Log canonical events
    await appendCanonicalEvent(supabase as any, {
      event_type: 'signer.invited', // Re-invited with new token
      workflow_id: workflowId,
      signer_id: signerId,
      payload: {
        reason: 'token_reissued',
        previous_status: signer.status,
        new_expires_at: expiresAt.toISOString(),
      },
      actor_id: user.id,
    }, 'reissue-signer-token');

    const appUrl = Deno.env.get('APP_URL') || 'https://app.ecosign.app';
    const signUrl = `${appUrl}/sign/${newToken}`;

    console.log('[reissue-signer-token] ✅ Token reissued successfully', {
      signerId,
      newExpiresAt: expiresAt.toISOString(),
    });

    return json({
      success: true,
      signerId,
      signerEmail: signer.email,
      signerName: signer.name,
      signUrl,
      expiresAt: expiresAt.toISOString(),
      message: `Token reissued for ${signer.email}. New link valid for ${TOKEN_LIFETIME_DAYS} days.`,
    });

  } catch (error) {
    console.error('[reissue-signer-token] Fatal error:', error);
    return json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
});
