/**
 * anchor-bitcoin Edge Function
 *
 * Queues a document hash for Bitcoin anchoring via OpenTimestamps.
 * Creates a record in the `anchors` table with status 'queued'.
 *
 * Called by:
 * - Database trigger (on_user_documents_blockchain_anchoring)
 * - Manual invocation for retry/recovery
 *
 * Contract: docs/contratos/ANCHOR_EVENT_RULES.md
 *
 * Architecture:
 * 1. This function QUEUES the anchor request
 * 2. process-bitcoin-anchors CRON batches and submits to OpenTimestamps
 * 3. Subsequent runs confirm and append to events[]
 *
 * Note: Bitcoin anchoring takes 4-24 hours due to block confirmation requirements.
 */

import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'
import { createLogger } from '../_shared/logger.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

export const config = {
  verify_jwt: false
}

const logger = createLogger('anchor-bitcoin')

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

type AnchorRequest = {
  documentHash: string
  documentId?: string | null
  userDocumentId?: string | null
  userId?: string | null
  userEmail?: string | null
  metadata?: Record<string, unknown>
}

const jsonResponse = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    }
  })

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined)

  if (req.method === 'OPTIONS') {
    if (!isAllowed) {
      return new Response('Forbidden', {
        status: 403,
        headers: corsHeaders
      })
    }

    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders)
  }

  try {
    if (!isAllowed) {
      return jsonResponse({ error: 'Origin not allowed' }, 403, corsHeaders)
    }

    const body = await req.json() as AnchorRequest
    const { documentHash, documentId = null, userDocumentId = null, userId = null, userEmail = null, metadata = {} } = body

    logger.info('anchor_bitcoin_request', {
      documentHash: documentHash?.substring(0, 16) + '...',
      documentId,
      userDocumentId,
      source: metadata?.source || 'direct'
    })

    if (!documentHash || typeof documentHash !== 'string') {
      logger.error('invalid_document_hash', { documentHash })
      return jsonResponse({ error: 'documentHash is required' }, 400, corsHeaders)
    }

    const isHex64 = /^[0-9a-f]{64}$/i
    if (!isHex64.test(documentHash.trim())) {
      logger.error('invalid_hash_format', { documentHash })
      return jsonResponse({ error: 'Invalid documentHash. Must be 64 hex characters (SHA-256).' }, 400, corsHeaders)
    }

    if (!supabaseAdmin) {
      logger.error('supabase_not_configured')
      return jsonResponse({ error: 'Supabase client is not configured' }, 500, corsHeaders)
    }

    const nowIso = new Date().toISOString()

    // Validate UUID format if userId is provided
    const isValidUUID = (uuid: string | null) => {
      if (!uuid) return false
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      return uuidRegex.test(uuid)
    }

    const validUserId = userId && isValidUUID(userId) ? userId : null

    const enrichedMetadata = {
      ...metadata,
      requestedAt: nowIso,
      source: metadata?.['source'] || 'client'
    }

    let projectId: string | null = typeof (metadata as Record<string, unknown>)?.['projectId'] === 'string'
      ? String((metadata as Record<string, unknown>)['projectId'])
      : null

    let finalDocumentId = documentId
    let finalUserEmail = userEmail
    let finalUserId = validUserId
    let documentEntityId: string | null = null

    const { data: existingAnchor, error: existingError } = await supabaseAdmin
      .from('anchors')
      .select('id, anchor_status, metadata, user_email')
      .eq('document_hash', documentHash)
      .eq('anchor_type', 'opentimestamps')
      .maybeSingle()

    if (existingError) {
      logger.warn('anchor_lookup_failed', { error: existingError.message })
    }

    if (existingAnchor && existingAnchor.anchor_status !== 'failed') {
      const existingMetadata = (existingAnchor.metadata || {}) as Record<string, unknown>
      const existingEmail = typeof existingAnchor.user_email === 'string'
        ? existingAnchor.user_email
        : (typeof existingMetadata['userEmail'] === 'string'
          ? String(existingMetadata['userEmail'])
          : finalUserEmail)

      logger.info('anchor_already_exists', {
        anchorId: existingAnchor.id,
        status: existingAnchor.anchor_status
      })

      return jsonResponse({
        anchorId: existingAnchor.id,
        status: existingAnchor.anchor_status,
        estimatedTime: '4-24 hours',
        message: 'Bitcoin anchoring already queued for this document hash.',
        willNotify: Boolean(existingEmail),
        notificationEmail: existingEmail,
        record: existingAnchor
      }, 200, corsHeaders)
    }

    if (userDocumentId && (!documentId || !userEmail || !projectId || !finalUserId)) {
      const { data: userDoc } = await supabaseAdmin
        .from('user_documents')
        .select('document_id, user_id, eco_data, document_entity_id')
        .eq('id', userDocumentId)
        .single()

      if (userDoc) {
        finalDocumentId = finalDocumentId || userDoc.document_id
        finalUserId = finalUserId || userDoc.user_id
        documentEntityId = userDoc.document_entity_id

        if (!projectId) {
          const ecoData = userDoc.eco_data as Record<string, unknown> | null
          const manifest = (ecoData?.['manifest'] as Record<string, unknown>) || null
          const manifestProjectId = manifest?.['projectId']
          projectId = typeof manifestProjectId === 'string' ? manifestProjectId : projectId
        }

        if (!userEmail && userDoc.user_id) {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userDoc.user_id)
          if (userData?.user?.email) {
            finalUserEmail = userData.user.email
          }
        }
      }
    }

    const anchorPayload = {
      document_hash: documentHash,
      document_id: finalDocumentId,
      user_document_id: userDocumentId,
      document_entity_id: documentEntityId,
      user_id: finalUserId,
      user_email: finalUserEmail,
      anchor_type: 'opentimestamps',
      anchor_status: 'queued',
      bitcoin_attempts: 0,
      bitcoin_error_message: null,
      error_message: null,
      ots_proof: null,
      ots_calendar_url: null,
      metadata: {
        ...(existingAnchor?.metadata ?? {}),
        ...enrichedMetadata,
        projectId: projectId || undefined,
        document_entity_id: documentEntityId
      }
    }

    // Insert anchor record with 'queued' status
    // process-bitcoin-anchors worker will batch these and submit to OpenTimestamps
    const { data, error } = existingAnchor
      ? await supabaseAdmin
        .from('anchors')
        .update(anchorPayload)
        .eq('id', existingAnchor.id)
        .select()
        .single()
      : await supabaseAdmin
        .from('anchors')
        .upsert(anchorPayload, { onConflict: 'document_hash,anchor_type' })
        .select()
        .single()

    if (error || !data) {
      logger.error('anchor_insert_failed', {
        error: error?.message,
        code: error?.code
      })
      return jsonResponse({
        error: 'Unable to create anchor request',
        details: error?.message || 'Unknown error',
        code: error?.code,
        hint: error?.hint
      }, 500, corsHeaders)
    }

    logger.info('anchor_queued', {
      anchorId: data.id,
      documentEntityId
    })

    // Update anchor_states for project tracking
    if (projectId) {
      const anchorRequestedAt = new Date().toISOString()
      const { error: stateError } = await supabaseAdmin
        .from('anchor_states')
        .upsert({
          project_id: projectId,
          anchor_requested_at: anchorRequestedAt
        }, { onConflict: 'project_id' })

      if (stateError) {
        logger.warn('anchor_state_upsert_failed', { projectId, error: stateError.message })
      }
    }

    // Update user_documents to reflect Bitcoin anchoring has started
    if (userDocumentId && (!existingAnchor || existingAnchor.anchor_status === 'failed')) {
      const { error: updateError } = await supabaseAdmin
        .from('user_documents')
        .update({
          overall_status: 'pending_anchor',
          bitcoin_status: 'pending',
          bitcoin_anchor_id: data.id,
        })
        .eq('id', userDocumentId)

      if (updateError) {
        logger.warn('user_document_update_failed', {
          userDocumentId,
          error: updateError.message
        })
      }
    }

    return jsonResponse({
      anchorId: data.id,
      status: data.anchor_status,
      estimatedTime: '4-24 hours',
      message: 'Bitcoin anchoring queued. This process requires Bitcoin blockchain confirmation and may take 4-24 hours. You will receive an email notification when complete.',
      willNotify: Boolean(finalUserEmail),
      notificationEmail: finalUserEmail,
      record: data
    }, 200, corsHeaders)
  } catch (error) {
    logger.error('anchor_bitcoin_error', {
      error: error instanceof Error ? error.message : String(error)
    })
    const message = error instanceof Error ? error.message : String(error)
    return jsonResponse({ error: message || 'Unexpected error' }, 500, corsHeaders)
  }
})
