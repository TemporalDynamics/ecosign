import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { getCorsHeaders } from '../_shared/cors.ts';

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

  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const authUser = await resolveAuthUser(supabase, req.headers.get('Authorization'));
    if (!authUser?.id) {
      return jsonResponse({ success: false, error: 'unauthorized' }, 401, corsHeaders);
    }

    const body = (await req.json().catch(() => ({}))) as {
      workflow_id?: string;
      signer_id?: string;
    };

    const workflowId = String(body.workflow_id ?? '');
    const signerId = String(body.signer_id ?? '');

    if (!workflowId || !signerId) {
      return jsonResponse({ success: false, error: 'workflow_id and signer_id required' }, 400, corsHeaders);
    }

    const { data: workflow, error: workflowError } = await supabase
      .from('signature_workflows')
      .select('id, owner_id, title')
      .eq('id', workflowId)
      .single();

    if (workflowError || !workflow) {
      return jsonResponse({ success: false, error: 'workflow_not_found' }, 404, corsHeaders);
    }

    if (workflow.owner_id !== authUser.id) {
      return jsonResponse({ success: false, error: 'forbidden' }, 403, corsHeaders);
    }

    const { data: claim, error: claimError } = await supabase
      .from('signer_package_claims')
      .select('id, signer_id, workflow_id, document_name, pdf_path, eco_path, created_at')
      .eq('workflow_id', workflowId)
      .eq('signer_id', signerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (claimError) {
      return jsonResponse({ success: false, error: 'signer_package_query_failed' }, 500, corsHeaders);
    }

    if (!claim) {
      return jsonResponse({ success: false, error: 'signer_package_not_found' }, 404, corsHeaders);
    }

    const resolveSignedUrl = async (bucket: string, path: string | null) => {
      if (!path) return null;
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 7 * 24 * 3600);
      return data?.signedUrl ?? null;
    };

    const pdfUrl = await resolveSignedUrl('user-documents', claim.pdf_path ?? null);
    const ecoBucket = typeof claim.eco_path === 'string' && claim.eco_path.startsWith('evidence/')
      ? 'artifacts'
      : 'user-documents';
    const ecoUrl = await resolveSignedUrl(ecoBucket, claim.eco_path ?? null);

    return jsonResponse({
      success: true,
      signer_id: signerId,
      workflow_id: workflowId,
      document_name: claim.document_name,
      pdf_url: pdfUrl,
      eco_url: ecoUrl,
      pdf_path: claim.pdf_path ?? null,
      eco_path: claim.eco_path ?? null,
    }, 200, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('get-signer-package-owner error:', message);
    return jsonResponse({ success: false, error: message }, 500, corsHeaders);
  }
});
