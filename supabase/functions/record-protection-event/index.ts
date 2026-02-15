/**
 * record-protection-event Edge Function
 *
 * Registra el evento canónico de inicio de protección:
 * - document.protected.requested
 *
 * Este evento marca el momento en que se SOLICITA la protección y dispara el pipeline
 * server-side (jobs) para TSA/anchors/artifact.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { withRateLimit } from '../_shared/ratelimit.ts'
import { appendEvent, getDocumentEntityId, getUserDocumentId } from '../_shared/eventHelper.ts'
import { FASE1_EVENT_KINDS } from '../_shared/fase1Events.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { decideAnchorPolicyByStage, resolveOwnerAnchorPlan } from '../_shared/anchorPlanPolicy.ts'

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

  // Used for best-effort failure event reporting in catch.
  let documentEntityId: string | null = null

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
    const flowVersion = flow_version ?? 'v2'
    if (flowVersion === 'v1') {
      console.warn('[record-protection-event] flow_version=v1 (legacy). Consider upgrading to v2.');
    }

    if (!document_id && !document_entity_id) {
      throw new Error('Missing required field: document_id or document_entity_id')
    }

    documentEntityId = document_entity_id ?? null
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
      .select('id, owner_id, witness_hash, source_hash')
      .eq('id', documentEntityId)
      .single()

    if (entityError || !entity) {
      throw new Error('Document entity not found for document_entity_id: ' + documentEntityId)
    }

    // Use witness_hash if available, otherwise fall back to source_hash
    const effectiveWitnessHash = entity.witness_hash || entity.source_hash

    const ownerId = (entity as any).owner_id ?? userId ?? null
    const planPolicy = await resolveOwnerAnchorPlan(supabase as any, ownerId)
    const anchorPolicy = decideAnchorPolicyByStage({
      stage: 'initial',
      forensicConfig: {
        rfc3161: protection_details.tsa_requested,
        polygon: protection_details.polygon_requested,
        bitcoin: protection_details.bitcoin_requested,
      },
      planKey: planPolicy.planKey,
      capabilities: planPolicy.capabilities,
      policySource: planPolicy.policySource,
    })

    // Build protection array (request signature type + policy-resolved anchors)
    const protectionMethods: string[] = []
    if (protection_details.signature_type && protection_details.signature_type !== 'none') {
      protectionMethods.push(protection_details.signature_type)
    }
    protectionMethods.push(...anchorPolicy.protection)

    const requestEventKind = FASE1_EVENT_KINDS.DOCUMENT_PROTECTED_REQUESTED

    // Idempotency: if protection was already requested, treat this call as success.
    const { data: existingEvents } = await supabase
      .from('document_entities')
      .select('events')
      .eq('id', documentEntityId)
      .single();

    const eventsArr = Array.isArray(existingEvents?.events) ? existingEvents.events : [];
    const alreadyRequested = eventsArr.some((e: any) => e?.kind === requestEventKind);
    if (alreadyRequested) {
      return new Response(
        JSON.stringify({
          success: true,
          event_recorded: false,
          idempotent: true,
          document_id: userDocumentId,
          document_entity_id: documentEntityId,
          protection_methods: protectionMethods,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    const documentProtectedEvent = {
      kind: requestEventKind,
      at: new Date().toISOString(),
      payload: {
        document_entity_id: documentEntityId,
        document_id: userDocumentId,
        document_hash: doc.document_hash,
        witness_hash: effectiveWitnessHash,
        protection: protectionMethods,
        anchor_stage: 'initial',
        step_index: 0,
        plan_key: anchorPolicy.plan_key,
        policy_source: anchorPolicy.policy_source,
        protection_details: {
          signature_type: protection_details.signature_type || 'none',
          forensic_enabled: protection_details.forensic_enabled,
          tsa_requested: anchorPolicy.allowed.tsa,
          polygon_requested: anchorPolicy.allowed.polygon,
          bitcoin_requested: anchorPolicy.allowed.bitcoin,
          contract_hash: doc.eco_hash || doc.document_hash,
        },
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

    const dedupeKey = `${documentEntityId}:${flowVersion === 'v2' ? 'protect_document_v2' : 'document.protected'}`;
    const { error: enqueueError } = await supabase
      .from('executor_jobs')
      .insert({
        type: flowVersion === 'v2' ? 'protect_document_v2' : FASE1_EVENT_KINDS.DOCUMENT_PROTECTED,
        entity_type: 'document',
        entity_id: documentEntityId,
        correlation_id: documentEntityId,  // NUEVO: canonical correlation
        dedupe_key: dedupeKey,
        payload: {
          document_entity_id: documentEntityId,
          document_id: userDocumentId,
          document_hash: doc.document_hash,
          witness_hash: effectiveWitnessHash,
          protection: protectionMethods,
          anchor_stage: 'initial',
          step_index: 0,
          plan_key: anchorPolicy.plan_key,
          policy_source: anchorPolicy.policy_source
        },
        status: 'queued',
        run_at: new Date().toISOString()
      })

    if (enqueueError) {
      console.error('Failed to enqueue executor job:', enqueueError.message)
      // If dedupe_key already exists, treat as idempotent success.
      if (!enqueueError.message?.toLowerCase().includes('duplicate')) {
        throw new Error('Failed to enqueue executor job: ' + enqueueError.message)
      }
    }

    // Best-effort: wake the execution engine immediately (so user doesn't wait for next cron tick).
    // Keep it non-blocking (short timeouts) and ignore failures.
    try {
      const supabaseUrl = (Deno.env.get('SUPABASE_URL') || '').replace(/\/+$/, '');
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      if (supabaseUrl && serviceRoleKey) {
        const post = async (fnName: string, body: Record<string, unknown>) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 1_500);
          try {
            await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
              method: 'POST',
              signal: controller.signal,
              headers: {
                'Content-Type': 'application/json',
                apikey: serviceRoleKey,
                Authorization: `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify(body),
            });
          } finally {
            clearTimeout(timeout);
          }
        };

        await Promise.allSettled([
          post('fase1-executor', { source: 'record-protection-event', limit: 5 }),
          post('orchestrator', { source: 'record-protection-event' }),
        ]);
      }
    } catch (wakeErr) {
      console.warn('[record-protection-event] wake execution engine failed (non-critical):', wakeErr);
    }

    console.log(`✅ ${requestEventKind} recorded for document ${userDocumentId}`)

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

    const message = error instanceof Error ? error.message : String(error)

    // Try to record protection.failed event if we have document_entity_id
    try {
      if (documentEntityId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        await appendEvent(
          supabase,
          documentEntityId,
          {
            kind: 'protection.failed',
            at: new Date().toISOString(),
            error: {
              message: message || 'Internal server error',
              code: 'RECORD_PROTECTION_FAILED'
            }
          },
          'record-protection-event'
        )
      }
    } catch (eventError) {
      console.error('Failed to record protection.failed event:', eventError)
      // Don't throw - we still want to return the original error
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
}))
