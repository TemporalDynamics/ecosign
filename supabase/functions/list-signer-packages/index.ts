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

    const { data: claims, error } = await supabase
      .from('signer_package_claims')
      .select('id, signer_id, workflow_id, document_name, pdf_path, eco_path, claimed_at, created_at')
      .eq('claimed_by', authUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      return jsonResponse({ success: false, error: 'claim_query_failed' }, 500, corsHeaders);
    }

    const resolveSignedUrl = async (bucket: string, path: string | null) => {
      if (!path) return null;
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 7 * 24 * 3600);
      return data?.signedUrl ?? null;
    };

    const items = [];
    for (const row of claims ?? []) {
      const pdfUrl = await resolveSignedUrl('user-documents', row.pdf_path ?? null);
      const ecoBucket = typeof row.eco_path === 'string' && row.eco_path.startsWith('evidence/')
        ? 'artifacts'
        : 'user-documents';
      const ecoUrl = await resolveSignedUrl(ecoBucket, row.eco_path ?? null);

      items.push({
        id: row.id,
        signerId: row.signer_id,
        workflowId: row.workflow_id,
        documentName: row.document_name,
        createdAt: row.created_at,
        claimedAt: row.claimed_at,
        pdfUrl,
        ecoUrl,
      });
    }

    return jsonResponse({ success: true, packages: items }, 200, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('list-signer-packages error:', message);
    return jsonResponse({ success: false, error: message }, 500, corsHeaders);
  }
});
