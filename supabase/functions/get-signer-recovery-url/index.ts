import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { getCorsHeaders } from '../_shared/cors.ts';
import { validateSignerAccessToken } from '../_shared/signerAccessToken.ts';
import { appendEvent } from '../_shared/eventHelper.ts';

interface RequestPayload {
  signerId: string;
  accessToken: string;
  resource: 'pdf' | 'eco';
}

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
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

    const { signerId, accessToken, resource } = (await req.json()) as RequestPayload;
    if (!signerId || !accessToken?.trim()) {
      return json({ error: 'signerId and accessToken required' }, 400, corsHeaders);
    }

    const signerValidation = await validateSignerAccessToken<{
      id: string;
      workflow_id: string;
      status: string | null;
      signing_order: number | null;
    }>(
      supabase,
      signerId,
      accessToken,
      'id, workflow_id, status, signing_order, access_token_hash, token_expires_at, token_revoked_at'
    );

    if (!signerValidation.ok) {
      return json({ error: signerValidation.error }, signerValidation.status, corsHeaders);
    }

    if (signerValidation.signer.status !== 'signed') {
      return json({ error: 'Signer not signed' }, 403, corsHeaders);
    }

    const { data: otp } = await supabase
      .from('signer_otps')
      .select('verified_at, expires_at')
      .eq('signer_id', signerValidation.signer.id)
      .maybeSingle();

    if (!otp?.verified_at) {
      return json({ error: 'OTP required', error_code: 'OTP_REQUIRED' }, 403, corsHeaders);
    }

    if (otp.expires_at && new Date(otp.expires_at) < new Date()) {
      return json({ error: 'OTP expired', error_code: 'OTP_EXPIRED' }, 403, corsHeaders);
    }

    const { data: claim, error: claimError } = await supabase
      .from('signer_package_claims')
      .select('pdf_path, eco_path')
      .eq('workflow_id', signerValidation.signer.workflow_id)
      .eq('signer_id', signerValidation.signer.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (claimError || !claim) {
      return json({ error: 'signer_package_not_found' }, 404, corsHeaders);
    }

    const targetResource = resource === 'eco' ? 'eco' : 'pdf';
    const path = targetResource === 'eco' ? claim.eco_path : claim.pdf_path;
    if (!path) {
      return json({ error: 'resource_not_available' }, 404, corsHeaders);
    }

    const bucket = targetResource === 'eco' && String(path).startsWith('evidence/')
      ? 'artifacts'
      : 'user-documents';

    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
    const signedUrl = data?.signedUrl ?? null;
    if (!signedUrl) {
      return json({ error: 'signed_url_failed' }, 500, corsHeaders);
    }

    let witnessHash: string | null = null;
    if (typeof claim.eco_path === 'string') {
      const filename = claim.eco_path.split('/').pop() ?? '';
      const extracted = filename.replace(/\.eco\.json$/, '');
      if (extracted && extracted !== filename) witnessHash = extracted;
    }

    try {
      const { data: workflow } = await supabase
        .from('signature_workflows')
        .select('document_entity_id')
        .eq('id', signerValidation.signer.workflow_id)
        .single();

      if (workflow?.document_entity_id) {
        await appendEvent(
          supabase as any,
          workflow.document_entity_id,
          {
            kind: 'signature.evidence.downloaded',
            at: new Date().toISOString(),
            payload: {
              signer_id: signerValidation.signer.id,
              step_index: signerValidation.signer.signing_order ?? null,
              resource: targetResource,
              witness_hash: witnessHash,
            },
          },
          'get-signer-recovery-url',
        );
      }
    } catch (err) {
      console.warn('get-signer-recovery-url: failed to append download event', err);
    }

    return json({ success: true, signed_url: signedUrl }, 200, corsHeaders);
  } catch (error: any) {
    console.error('get-signer-recovery-url error', error);
    return json({ error: error?.message || 'Unexpected error' }, 500, corsHeaders);
  }
});
