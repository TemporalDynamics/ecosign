import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { buildCanonicalEcoCertificate } from '../_shared/ecoCanonicalCertificate.ts'
import { signFinalEcoInstitutionally } from '../_shared/ecoInstitutionalSignature.ts'
import { buildEpiBlockFromEvents, deriveContentAt } from '../_shared/epiCanvas.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
}

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Verify user JWT
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  }) as any
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

  const body = (await req.json().catch(() => ({}))) as { document_entity_id?: string }
  const documentEntityId = String(body.document_entity_id || '').trim()
  if (!documentEntityId) return jsonResponse({ error: 'document_entity_id required' }, 400)

  const supabase = createClient(supabaseUrl, serviceRole) as any

  const { data: entity, error: entityError } = await supabase
    .from('document_entities')
    .select('id, source_name, source_mime, source_hash, witness_hash, signed_hash, events, owner_id, created_at')
    .eq('id', documentEntityId)
    .single()

  if (entityError || !entity) return jsonResponse({ error: 'Document not found' }, 404)
  if (entity.owner_id !== user.id) return jsonResponse({ error: 'Forbidden' }, 403)

  const events = Array.isArray(entity.events) ? entity.events : []

  // snapshot_kind drives how issued_at is derived from events:
  // - 'final_artifact' → uses artifact.finalized.at
  // - 'protected_snapshot' → uses tsa.confirmed.at (or document.protected.requested.at as fallback)
  const hasFinalizedEvent = events.some((e: any) => e?.kind === 'artifact.finalized')
  const snapshotKind = hasFinalizedEvent ? 'final_artifact' : 'protected_snapshot'

  // Extract workflow_id from signature.completed event — no extra query needed.
  const signingEvent = events.find((e: any) => e?.kind === 'signature.completed' && e?.workflow?.id)
  const workflowId: string | null = signingEvent?.workflow?.id ?? null

  // issued_at for accumulated_document_evidence must be the moment the ECO is generated,
  // not a historical TSA timestamp. Otherwise a proof confirmed after TSA (e.g. Polygon at T+2min)
  // would have attempted_at > issued_at — a temporal contradiction.
  const generatedAt = new Date().toISOString()

  try {
    const ecoCertificate = buildCanonicalEcoCertificate({
      document_entity_id: documentEntityId,
      document_name: entity.source_name ?? null,
      source_mime: entity.source_mime ?? null,
      source_hash: entity.source_hash ?? null,
      witness_hash: entity.witness_hash ?? null,
      signed_hash: entity.signed_hash ?? null,
      events,
      workflow_id: workflowId,
      snapshot_kind: snapshotKind,
      issued_at: generatedAt,
      issued_at_source_override: 'eco.generated.at',
    })

    const contentAt = deriveContentAt(events, entity.created_at ?? null)
    const epiBlock = await buildEpiBlockFromEvents({
      source_hash: entity.source_hash ?? null,
      content_at: contentAt || null,
      events,
    })
    if (epiBlock) {
      ;(ecoCertificate as Record<string, unknown>).epi = epiBlock
    }

    const signedResult = await signFinalEcoInstitutionally(
      ecoCertificate as Record<string, unknown>,
    )

    return new Response(JSON.stringify(signedResult.eco, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  } catch (err: any) {
    // issued_at derivation fails if TSA hasn't confirmed yet
    if (typeof err?.message === 'string' && err.message.startsWith('issued_at_required')) {
      return jsonResponse({ error: 'eco_not_ready', detail: err.message }, 404)
    }
    console.error('get-eco error', err)
    return jsonResponse({ error: err?.message || 'Unexpected error' }, 500)
  }
})
