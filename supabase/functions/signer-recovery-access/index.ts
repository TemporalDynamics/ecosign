import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { createTokenHash } from '../_shared/cryptoHelper.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

interface RequestBody {
  token: string;
}

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token } = (await req.json()) as RequestBody;
    if (!token) return json({ error: 'token is required' }, 400, corsHeaders);

    const isTokenHash = (value: string) => /^[a-f0-9]{64}$/i.test(value);
    const tokenHash = isTokenHash(token) ? token : await createTokenHash(token);

    const { data: signer, error: signerError } = await supabase
      .from('workflow_signers')
      .select('id, email, name, status, workflow_id, token_expires_at, token_revoked_at, workflow:signature_workflows (id, title, status)')
      .eq('access_token_hash', tokenHash)
      .single();

    if (signerError || !signer) {
      return json({ error: 'Invalid or expired token' }, 404, corsHeaders);
    }

    if (signer.token_revoked_at) {
      return json({ error: 'Invalid or expired token' }, 404, corsHeaders);
    }

    if (signer.token_expires_at && new Date(signer.token_expires_at) < new Date()) {
      return json({ error: 'Invalid or expired token' }, 404, corsHeaders);
    }

    if (signer.status !== 'signed') {
      return json({ error: 'Signer is not signed', error_code: 'SIGNER_NOT_SIGNED' }, 403, corsHeaders);
    }

    const workflowStatus = signer.workflow?.status;
    if (workflowStatus && !['active', 'completed'].includes(workflowStatus)) {
      return json({ error: 'Workflow is not available for recovery', error_code: 'WORKFLOW_NOT_AVAILABLE' }, 403, corsHeaders);
    }

    const { data: claim } = await supabase
      .from('signer_package_claims')
      .select('document_name')
      .eq('workflow_id', signer.workflow_id)
      .eq('signer_id', signer.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return json({
      success: true,
      signer_id: signer.id,
      signer_email: signer.email,
      signer_name: signer.name,
      workflow_id: signer.workflow_id,
      workflow_title: signer.workflow?.title ?? null,
      workflow_status: workflowStatus ?? null,
      document_name: claim?.document_name ?? signer.workflow?.title ?? 'Documento',
      package_ready: Boolean(claim?.document_name),
    }, 200, corsHeaders);
  } catch (error) {
    console.error('signer-recovery-access error:', error);
    return json({ error: error instanceof Error ? error.message : 'Internal error' }, 500, corsHeaders);
  }
});
