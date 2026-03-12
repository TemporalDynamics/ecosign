import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { generateSecretToken, createTokenHash, encryptToken } from '../_shared/cryptoHelper.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

interface ReissueRequest {
  workflowId: string;
  signerId: string;
}

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });

const TOKEN_LIFETIME_DAYS = 7;

serve(async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined);
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }

  if (req.method === 'OPTIONS') {
    if (!isAllowed) return new Response('Forbidden', { status: 403, headers: corsHeaders });
    return new Response('ok', { headers: corsHeaders });
  }

  if (!isAllowed) return json({ error: 'Origin not allowed' }, 403, corsHeaders);
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, corsHeaders);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401, corsHeaders);

    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, 401, corsHeaders);

    const body: ReissueRequest = await req.json();
    const { workflowId, signerId } = body;

    if (!workflowId || !signerId) {
      return json({ error: 'Missing workflowId or signerId' }, 400, corsHeaders);
    }

    const { data: workflow, error: wfError } = await supabase
      .from('signature_workflows')
      .select('id, owner_id, status')
      .eq('id', workflowId)
      .single();

    if (wfError || !workflow) return json({ error: 'Workflow not found' }, 404, corsHeaders);
    if (workflow.owner_id !== user.id) return json({ error: 'Only owner can reissue recovery link' }, 403, corsHeaders);

    const allowedWorkflowStatuses = ['active', 'completed'];
    if (!allowedWorkflowStatuses.includes(workflow.status)) {
      return json({
        error: `Workflow status is "${workflow.status}"`,
        hint: 'Recovery link only available for active or completed workflows'
      }, 400, corsHeaders);
    }

    const { data: signer, error: signerError } = await supabase
      .from('workflow_signers')
      .select('id, email, name, status')
      .eq('id', signerId)
      .eq('workflow_id', workflowId)
      .single();

    if (signerError || !signer) return json({ error: 'Signer not found in this workflow' }, 404, corsHeaders);

    if (signer.status !== 'signed') {
      return json({
        error: `Signer status is "${signer.status}"`,
        hint: 'Recovery link only available for signed signers'
      }, 400, corsHeaders);
    }

    const newToken = await generateSecretToken();
    const newTokenHash = await createTokenHash(newToken);
    const { ciphertext, nonce } = await encryptToken(newToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_LIFETIME_DAYS);

    const { error: updateError } = await supabase
      .from('workflow_signers')
      .update({
        token_revoked_at: new Date().toISOString(),
        access_token_hash: newTokenHash,
        access_token_ciphertext: ciphertext,
        access_token_nonce: nonce,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', signerId);

    if (updateError) {
      return json({ error: 'Failed to reissue recovery token', details: updateError.message }, 500, corsHeaders);
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://app.ecosign.app';
    const recoveryUrl = `${appUrl}/recover/${newToken}`;

    return json({
      success: true,
      signerId,
      signerEmail: signer.email,
      signerName: signer.name,
      recoveryUrl,
      expiresAt: expiresAt.toISOString(),
    }, 200, corsHeaders);
  } catch (error) {
    console.error('reissue-signer-recovery-token error:', error);
    return json({ error: error instanceof Error ? error.message : 'Internal error' }, 500, corsHeaders);
  }
});
