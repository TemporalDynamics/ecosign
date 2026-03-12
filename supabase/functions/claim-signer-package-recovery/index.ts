import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { getCorsHeaders } from '../_shared/cors.ts';
import { validateSignerAccessToken } from '../_shared/signerAccessToken.ts';

interface RequestPayload {
  signerId: string;
  accessToken: string;
}

const jsonResponse = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
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
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (!isAllowed) return jsonResponse({ error: 'Origin not allowed' }, 403, corsHeaders);
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing authorization' }, 401, corsHeaders);

    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);

    const { signerId, accessToken } = (await req.json()) as RequestPayload;
    if (!signerId || !accessToken?.trim()) {
      return jsonResponse({ error: 'signerId and accessToken required' }, 400, corsHeaders);
    }

    const signerValidation = await validateSignerAccessToken<{
      id: string;
      workflow_id: string;
      status: string | null;
    }>(
      supabase,
      signerId,
      accessToken,
      'id, workflow_id, status, access_token_hash, token_expires_at, token_revoked_at'
    );

    if (!signerValidation.ok) {
      return jsonResponse({ error: signerValidation.error }, signerValidation.status, corsHeaders);
    }

    if (signerValidation.signer.status !== 'signed') {
      return jsonResponse({ error: 'Signer not signed' }, 403, corsHeaders);
    }

    const { data: otp } = await supabase
      .from('signer_otps')
      .select('verified_at, expires_at')
      .eq('signer_id', signerValidation.signer.id)
      .maybeSingle();

    if (!otp?.verified_at) {
      return jsonResponse({ error: 'OTP required', error_code: 'OTP_REQUIRED' }, 403, corsHeaders);
    }

    if (otp.expires_at && new Date(otp.expires_at) < new Date()) {
      return jsonResponse({ error: 'OTP expired', error_code: 'OTP_EXPIRED' }, 403, corsHeaders);
    }

    const { data: claim, error: claimError } = await supabase
      .from('signer_package_claims')
      .select('id, claimed_by')
      .eq('workflow_id', signerValidation.signer.workflow_id)
      .eq('signer_id', signerValidation.signer.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (claimError || !claim) {
      return jsonResponse({ error: 'signer_package_not_found' }, 404, corsHeaders);
    }

    if (claim.claimed_by && claim.claimed_by !== user.id) {
      return jsonResponse({ error: 'claim_already_assigned' }, 409, corsHeaders);
    }

    if (!claim.claimed_by) {
      const { error: updateError } = await supabase
        .from('signer_package_claims')
        .update({ claimed_by: user.id, claimed_at: new Date().toISOString() })
        .eq('id', claim.id);

      if (updateError) {
        return jsonResponse({ error: 'claim_update_failed', details: updateError.message }, 500, corsHeaders);
      }
    }

    return jsonResponse({ success: true }, 200, corsHeaders);
  } catch (error) {
    console.error('claim-signer-package-recovery error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Internal error' }, 500, corsHeaders);
  }
});
