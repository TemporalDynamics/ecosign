import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { sha256Hex } from '../_shared/canonicalHash.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { normalizeEmail } from '../_shared/email.ts';

const jsonResponse = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });

async function resolveAuthUser(supabase: any, authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

serve(async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined);

  if (req.method === 'OPTIONS') {
    if (!isAllowed) return new Response('Forbidden', { status: 403, headers: corsHeaders });
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (!isAllowed) {
    return jsonResponse({ success: false, error: 'Origin not allowed' }, 403, corsHeaders);
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const body = (await req.json().catch(() => ({}))) as { claim_token?: string };
    const claimToken = String(body?.claim_token ?? '').trim();
    if (!claimToken) {
      return jsonResponse({ success: false, error: 'claim_token_required' }, 400, corsHeaders);
    }

    const authUser = await resolveAuthUser(supabase, req.headers.get('Authorization'));
    if (!authUser?.id || !authUser.email) {
      return jsonResponse({ success: false, error: 'unauthorized' }, 401, corsHeaders);
    }

    const claimTokenHash = await sha256Hex(claimToken);
    const { data: claimRow, error: claimError } = await supabase
      .from('signer_package_claims')
      .select('*')
      .eq('claim_token_hash', claimTokenHash)
      .single();

    if (claimError || !claimRow) {
      return jsonResponse({ success: false, error: 'claim_not_found' }, 404, corsHeaders);
    }

    if (claimRow.claimed_by && claimRow.claimed_by !== authUser.id) {
      return jsonResponse({ success: false, error: 'claim_already_used' }, 409, corsHeaders);
    }

    const normalizedUserEmail = normalizeEmail(authUser.email);
    const normalizedSignerEmail = normalizeEmail(claimRow.signer_email ?? '');
    if (normalizedSignerEmail && normalizedSignerEmail !== normalizedUserEmail) {
      return jsonResponse({ success: false, error: 'claim_email_mismatch' }, 403, corsHeaders);
    }

    if (!claimRow.claimed_at) {
      await supabase
        .from('signer_package_claims')
        .update({ claimed_at: new Date().toISOString(), claimed_by: authUser.id })
        .eq('id', claimRow.id);
    }

    return jsonResponse(
      {
        success: true,
        claimed: true,
        documentName: claimRow.document_name ?? null,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('claim-signer-package error:', message);
    return jsonResponse({ success: false, error: message }, 500, corsHeaders);
  }
});
