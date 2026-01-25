import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.92.0?target=deno';
import { appendTsaEventFromEdge } from '../_shared/tsaHelper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

type RequestBody = {
  document_entity_id: string;
  token_b64: string;
  // Optional metadata from TSA response
  gen_time?: string;
  tsa_url?: string;
  digest_algo?: string;
  policy_oid?: string;
  serial?: string;
  tsa_cert_fingerprint?: string;
  token_hash?: string;
};

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response(null, { status: 204 });
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    // Parse request body
    const body = (await req.json()) as RequestBody;
    if (!body?.document_entity_id || !body?.token_b64) {
      return jsonResponse(
        { success: false, error: 'Missing document_entity_id or token_b64' },
        400
      );
    }

    // 1) Read canonical witness_hash from DB
    const { data: entity, error: fetchError } = await supabase
      .from('document_entities')
      .select('id, witness_hash, events')
      .eq('id', body.document_entity_id)
      .single();

    if (fetchError || !entity) {
      return jsonResponse(
        { success: false, error: fetchError?.message ?? 'document_entity not found' },
        400
      );
    }

    if (!entity.witness_hash) {
      return jsonResponse(
        { success: false, error: 'document_entity has no witness_hash' },
        400
      );
    }

    // 2) Use the canonical TSA helper to append event
    const result = await appendTsaEventFromEdge(supabase, body.document_entity_id, {
      token_b64: body.token_b64,
      witness_hash: entity.witness_hash, // Use DB canonical witness_hash
      gen_time: body.gen_time,
      policy_oid: body.policy_oid,
      serial: body.serial,
      digest_algo: body.digest_algo ?? 'sha256',
      tsa_cert_fingerprint: body.tsa_cert_fingerprint,
      token_hash: body.token_hash,
    });

    if (!result.success) {
      return jsonResponse(result, 400);
    }

    // 3) Return updated entity
    const { data: updated, error: refetchError } = await supabase
      .from('document_entities')
      .select('id, witness_hash, events')
      .eq('id', body.document_entity_id)
      .single();

    if (refetchError) {
      return jsonResponse({ success: false, error: refetchError.message }, 400);
    }

    return jsonResponse({
      success: true,
      document_entity: updated,
    });
  } catch (e) {
    console.error('append-tsa-event error:', e);
    return jsonResponse(
      { success: false, error: String(e) },
      500
    );
  }
});
