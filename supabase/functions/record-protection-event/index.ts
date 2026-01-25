/**
 * record-protection-event Edge Function
 *
 * Registra el evento 'protection_enabled' cuando se completa el flujo
 * del Centro Legal (firma + TSA + anclas solicitadas).
 *
 * Este evento marca el momento en que la protección se HABILITÓ, no necesariamente
 * cuando se completó (los anchors blockchain se procesan async por workers).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.92.0?target=deno'
import { withRateLimit } from '../_shared/ratelimit.ts'
import { appendEvent, getDocumentEntityId, getUserDocumentId } from '../_shared/eventHelper.ts'
import { FASE1_EVENT_KINDS } from '../_shared/fase1Events.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

interface RecordProtectionRequest {
  document_id?: string
  document_entity_id?: string
  flow_version?: 'v1' | 'v2'
  protection_details: {
    signature_type?: 'legal' | 'certified' | 'none'
    forensic_enabled: boolean
    tsa_requested?: boolean
    polygon_requested?: boolean
    bitcoin_requested?: boolean
  }
}

serve(withRateLimit('record', async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    if (!isAllowed) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }
    return new Response('ok', { headers: corsHeaders })
  }

  if (!isAllowed) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const origin = req.headers.get('origin') ?? 'unknown'
    const rawBody = await req.clone().text()
    console.log('[record-protection-event] origin:', origin)
    console.log('[record-protection-event] raw body:', rawBody)

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header (optional - protection events can be anonymous)
    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null

    if (authHeader) {
      const supabaseAuth = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      )

      const { data: { user } } = await supabaseAuth.auth.getUser()
      userId = user?.id || null
    }

    // Parse request body
    const body: RecordProtectionRequest = await req.json()
    const { document_id, document_entity_id, protection_details, flow_version } = body
    const flowVersion = flow_version ?? 'v1'

    if (!document_id && !document_entity_id) {
      throw new Error('Missing required field: document_id or document_entity_id')
    }

    let documentEntityId = document_entity_id ?? null
    let userDocumentId = document_id ?? null

    if (!documentEntityId && userDocumentId) {
      documentEntityId = await getDocumentEntityId(supabase, userDocumentId)
    }

    if (!userDocumentId && documentEntityId) {
      userDocumentId = await getUserDocumentId(supabase, documentEntityId)
    }

    if (!documentEntityId) {
      throw new Error('Document entity not found for document_id: ' + (document_id ?? 'null'))
    }

    if (!userDocumentId) {
      throw new Error('User document not found for document_entity_id: ' + documentEntityId)
    }

    // Get document info for event context
    const { data: doc, error: docError } = await supabase
      .from('user_documents')
      .select('id, document_hash, eco_hash, protection_level, polygon_status, bitcoin_status')
      .eq('id', userDocumentId)
      .single()

    if (docError || !doc) {
      throw new Error('Document not found')
    }

    const { data: entity, error: entityError } = await supabase
      .from('document_entities')
      .select('id, witness_hash, source_hash')
      .eq('id', documentEntityId)
      .single()

    if (entityError || !entity) {
      throw new Error('Document entity not found for document_entity_id: ' + documentEntityId)
    }

    // Use witness_hash if available, otherwise fall back to source_hash
    const effectiveWitnessHash = entity.witness_hash || entity.source_hash

    // Build protection array (what was requested/enabled)
    const protectionMethods: string[] = []

    if (protection_details.signature_type && protection_details.signature_type !== 'none') {
      protectionMethods.push(protection_details.signature_type)
    }

    if (protection_details.tsa_requested) {
      protectionMethods.push('tsa')
    }

    if (protection_details.polygon_requested) {
      protectionMethods.push('polygon')
    }

    if (protection_details.bitcoin_requested) {
      protectionMethods.push('bitcoin')
    }

    // Construct the protection_enabled event (legacy-compatible)
    const protectionEvent = {
      kind: 'protection_enabled',
      at: new Date().toISOString(),
      protection: {
        methods: protectionMethods,
        signature_type: protection_details.signature_type || 'none',
        forensic_enabled: protection_details.forensic_enabled,
        contract_hash: doc.eco_hash || doc.document_hash
      },
      forensic: {
        tsa_requested: protection_details.tsa_requested || false,
        polygon_requested: protection_details.polygon_requested || false,
        bitcoin_requested: protection_details.bitcoin_requested || false,
        protection_level: doc.protection_level || 'ACTIVE'
      }
    }

    // Append event to canonical ledger
    const eventResult = await appendEvent(
      supabase,
      documentEntityId,
      protectionEvent,
      'record-protection-event'
    )

    if (!eventResult.success) {
      console.error('Failed to append protection_enabled event:', eventResult.error)
      throw new Error('Failed to record protection event: ' + eventResult.error)
    }

    const requestEventKind =
      flowVersion === 'v2'
        ? FASE1_EVENT_KINDS.DOCUMENT_PROTECTED_REQUESTED
        : FASE1_EVENT_KINDS.DOCUMENT_PROTECTED
    const documentProtectedEvent = {
      kind: requestEventKind,
      at: new Date().toISOString(),
      payload: {
        document_entity_id: documentEntityId,
        document_id: userDocumentId,
        document_hash: doc.document_hash,
        witness_hash: effectiveWitnessHash,
        protection: protectionMethods
      }
    }

    const protectedResult = await appendEvent(
      supabase,
      documentEntityId,
      documentProtectedEvent,
      'record-protection-event'
    )

    if (!protectedResult.success) {
      console.error('Failed to append document.protected event:', protectedResult.error)
      throw new Error('Failed to record document.protected event: ' + protectedResult.error)
    }

    const { error: enqueueError } = await supabase
      .from('executor_jobs')
      .insert({
        type: flowVersion === 'v2' ? 'protect_document_v2' : FASE1_EVENT_KINDS.DOCUMENT_PROTECTED,
        entity_type: 'document',
        entity_id: documentEntityId,
        payload: {
          document_entity_id: documentEntityId,
          document_id: userDocumentId,
          document_hash: doc.document_hash,
          witness_hash: effectiveWitnessHash
        },
        status: 'queued',
        run_at: new Date().toISOString()
      })

    if (enqueueError) {
      console.error('Failed to enqueue executor job:', enqueueError.message)
      throw new Error('Failed to enqueue executor job: ' + enqueueError.message)
    }

    console.log(`✅ protection_enabled + ${requestEventKind} recorded for document ${userDocumentId}`)

    return new Response(
      JSON.stringify({
        success: true,
        event_recorded: true,
        document_id: userDocumentId,
        document_entity_id: documentEntityId,
        protection_methods: protectionMethods
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in record-protection-event:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
}))
