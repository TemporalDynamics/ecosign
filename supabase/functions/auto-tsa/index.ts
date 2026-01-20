import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { appendTsaEventFromEdge } from '../_shared/tsaHelper.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FUNCTIONS_URL = `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1`

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

const isFlagEnabled = (name: string) =>
  String(Deno.env.get(name) ?? '').toLowerCase() === 'true'

serve(async (req) => {
  // FASE guard disabled for MVP
  // if (Deno.env.get('FASE') !== '1') {
  //   return new Response('disabled', { status: 204 })
  // }

  if (isFlagEnabled('V2_AUTHORITY_ONLY') || isFlagEnabled('DISABLE_AUTO_TSA')) {
    return new Response('disabled', { status: 204 })
  }

  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405)

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const body = await req.json().catch(() => ({}))
    const documentEntityId = String(body?.document_entity_id ?? '')
    if (!documentEntityId) return jsonResponse({ success: false, error: 'document_entity_id required' }, 400)

    // 1) Read witness_hash
    const { data: entity, error: fetchError } = await supabase
      .from('document_entities')
      .select('id, witness_hash')
      .eq('id', documentEntityId)
      .single()

    if (fetchError || !entity) return jsonResponse({ success: false, error: 'document_entity not found' }, 404)
    const witnessHash = entity.witness_hash
    if (!witnessHash) return jsonResponse({ success: false, error: 'document_entity has no witness_hash' }, 400)

    // 2) Request TSA token via legal-timestamp function
    const response = await fetch(`${FUNCTIONS_URL}/legal-timestamp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ hash_hex: witnessHash })
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = (data as any)?.error || `TSA request failed: HTTP ${response.status}`
      return jsonResponse({ success: false, error: message }, 502)
    }

    const token_b64 = (data as any)?.token
    if (!token_b64) return jsonResponse({ success: false, error: 'TSA token missing in response' }, 502)

    // 3) Append TSA event using canonical helper
    const appendResult = await appendTsaEventFromEdge(supabase, documentEntityId, {
      token_b64,
      witness_hash: witnessHash,
      gen_time: (data as any)?.gen_time,
      tsa_url: (data as any)?.tsa_url,
      digest_algo: (data as any)?.algorithm ?? 'sha256',
      token_hash: (data as any)?.token_hash
    })

    if (!appendResult.success) {
      return jsonResponse({ success: false, error: appendResult.error }, 500)
    }

    return new Response(JSON.stringify({ success: true, document_entity_id: documentEntityId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('auto-tsa error:', e)
    return jsonResponse({ success: false, error: String(e) }, 500)
  }
})
