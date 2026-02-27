/**
 * anchor-polygon Edge Function
 *
 * Submits a document hash to Polygon blockchain for anchoring.
 * Creates a record in the `anchors` table and submits a transaction.
 *
 * Called by:
 * - Database trigger (legacy anchoring trigger)
 * - Manual invocation for retry/recovery
 *
 * Contract: docs/contratos/ANCHOR_EVENT_RULES.md
 *
 * Architecture:
 * 1. This function SUBMITS the TX and creates anchor record
 * 2. process-polygon-anchors CRON confirms TX and appends to events[]
 */

import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { ethers } from 'npm:ethers@6.9.0'
import { createLogger } from '../_shared/logger.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { requireInternalAuth } from '../_shared/internalAuth.ts'

export const config = {
  verify_jwt: true
}

const logger = createLogger('anchor-polygon')

const isFlagEnabled = (name: string) =>
  String(Deno.env.get(name) ?? '').toLowerCase() === 'true'

type AnchorRequest = {
  documentHash: string
  documentEntityId?: string | null
  documentId?: string | null
  userDocumentId?: string | null
  userId?: string | null
  userEmail?: string | null
  metadata?: Record<string, unknown>
}

async function resolveAnchorContext(
  supabase: ReturnType<typeof createClient>,
  input: {
    documentEntityId: string | null
    documentId: string | null
    userId: string | null
    userEmail: string | null
  },
): Promise<{
  documentId: string | null
  userId: string | null
  userEmail: string | null
}> {
  let documentId = input.documentId
  let userId = input.userId
  let userEmail = input.userEmail

  if (!input.documentEntityId) {
    return { documentId, userId, userEmail }
  }

  if (!documentId) {
    const { data: doc } = await supabase
      .from('documents')
      .select('id')
      .eq('document_entity_id', input.documentEntityId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (doc?.id) {
      documentId = String(doc.id)
    }
  }

  if (!userId) {
    const { data: entity } = await supabase
      .from('document_entities')
      .select('owner_id')
      .eq('id', input.documentEntityId)
      .maybeSingle()
    if (entity?.owner_id) {
      userId = String(entity.owner_id)
    }
  }

  if (!userEmail && userId) {
    const { data: userData } = await supabase.auth.admin.getUserById(userId)
    if (userData?.user?.email) {
      userEmail = userData.user.email
    }
  }

  return { documentId, userId, userEmail }
}

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response(null, { status: 204 });
  }

  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined)

  if (req.method === 'OPTIONS') {
    if (!isAllowed) {
      return new Response('Forbidden', {
        status: 403,
        headers: corsHeaders
      })
    }

    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  const auth = requireInternalAuth(req, { allowCronSecret: true })
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json() as AnchorRequest
    const {
      documentHash,
      documentEntityId: requestDocumentEntityId = null,
      documentId = null,
      userDocumentId = null,
      userId = null,
      userEmail = null,
      metadata = {}
    } = body

    const authorityOnly = isFlagEnabled('V2_AUTHORITY_ONLY') || isFlagEnabled('DISABLE_DB_ANCHOR_TRIGGERS')
    const source = typeof metadata?.source === 'string' ? metadata.source : null
    if (authorityOnly && source !== 'executor_v2') {
      logger.warn('anchor_polygon_blocked', { source });
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    logger.info('anchor_polygon_request', {
      documentHash: documentHash?.substring(0, 16) + '...',
      documentId,
      userDocumentId,
      source: metadata?.source || 'direct'
    })

    // Validate documentHash
    if (!documentHash || typeof documentHash !== 'string') {
      logger.error('invalid_document_hash', { documentHash })
      return new Response(JSON.stringify({
        error: 'documentHash is required and must be a string'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const isHex64 = /^[0-9a-f]{64}$/i
    if (!isHex64.test(documentHash.trim())) {
      logger.error('invalid_hash_format', { documentHash })
      return new Response(JSON.stringify({
        error: 'Invalid documentHash. Must be 64 hex characters (SHA-256)'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: existingAnchor, error: existingError } = await supabase
      .from('anchors')
      .select('id, anchor_status, polygon_status, polygon_tx_hash, metadata')
      .eq('document_hash', documentHash)
      .eq('anchor_type', 'polygon')
      .maybeSingle()

    if (existingError) {
      logger.warn('anchor_lookup_failed', { error: existingError.message })
    }

    if (existingAnchor && existingAnchor.anchor_status !== 'failed') {
      const existingMetadata = (existingAnchor.metadata || {}) as Record<string, unknown>
      const existingSponsorAddress = typeof existingMetadata['sponsorAddress'] === 'string'
        ? String(existingMetadata['sponsorAddress'])
        : undefined

      logger.info('anchor_already_exists', {
        anchorId: existingAnchor.id,
        status: existingAnchor.anchor_status
      })

      return new Response(JSON.stringify({
        success: true,
        status: existingAnchor.polygon_status ?? existingAnchor.anchor_status,
        txHash: existingAnchor.polygon_tx_hash,
        anchorId: existingAnchor.id,
        message: 'Anchor already exists for this document hash.',
        sponsorAddress: existingSponsorAddress,
        explorerUrl: existingAnchor.polygon_tx_hash
          ? `https://polygonscan.com/tx/${existingAnchor.polygon_tx_hash}`
          : undefined
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Load Polygon config from environment
    const rpcUrl =
      Deno.env.get('POLYGON_RPC_URL') ??
      Deno.env.get('ALCHEMY_RPC_URL')

    const sponsorPrivateKey =
      Deno.env.get('POLYGON_PRIVATE_KEY') ??
      Deno.env.get('SPONSOR_PRIVATE_KEY')

    const contractAddress = Deno.env.get('POLYGON_CONTRACT_ADDRESS')

    if (!rpcUrl || !sponsorPrivateKey || !contractAddress) {
      logger.error('missing_polygon_config', {
        hasRpcUrl: !!rpcUrl,
        hasPrivateKey: !!sponsorPrivateKey,
        hasContractAddress: !!contractAddress
      })
      return new Response(JSON.stringify({
        error: 'Missing Polygon config (POLYGON_RPC_URL, POLYGON_PRIVATE_KEY, POLYGON_CONTRACT_ADDRESS)'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Connect to Polygon
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const sponsorWallet = new ethers.Wallet(sponsorPrivateKey, provider)
    const sponsorAddress = await sponsorWallet.getAddress()

    // Check balance
    const balance = await provider.getBalance(sponsorAddress)
    if (balance === 0n) {
      logger.error('sponsor_no_balance', { sponsorAddress })
      return new Response(JSON.stringify({
        error: 'Sponsor wallet has no POL',
        sponsorAddress
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create contract instance
    const abi = ['function anchorDocument(bytes32 _docHash) external']
    const contract = new ethers.Contract(contractAddress, abi, sponsorWallet)

    // Submit transaction to Polygon
    const hashBytes32 = '0x' + documentHash
    const tx = await contract.anchorDocument(hashBytes32)
    const txHash = tx.hash

    logger.info('tx_submitted', {
      txHash,
      documentHash: documentHash.substring(0, 16) + '...',
      sponsorAddress
    })

    // Resolve missing canonical context from document_entity_id/documents.
    let finalDocumentId = documentId
    let finalUserEmail = userEmail
    let finalUserId = userId
    let projectId: string | null = typeof (metadata as Record<string, unknown>)?.['projectId'] === 'string'
      ? String((metadata as Record<string, unknown>)['projectId'])
      : null
    const metadataDocumentEntityId = typeof (metadata as Record<string, unknown>)?.['document_entity_id'] === 'string'
      ? String((metadata as Record<string, unknown>)['document_entity_id'])
      : null
    let documentEntityId: string | null = requestDocumentEntityId || metadataDocumentEntityId

    const resolvedContext = await resolveAnchorContext(supabase as any, {
      documentEntityId,
      documentId: finalDocumentId,
      userId: finalUserId,
      userEmail: finalUserEmail,
    })
    finalDocumentId = resolvedContext.documentId
    finalUserId = resolvedContext.userId
    finalUserEmail = resolvedContext.userEmail

    if (userDocumentId) {
      logger.info('legacy_user_document_id_received', {
        userDocumentId,
        note: 'ignored_in_canonical_mode',
      })
    }

    const anchorPayload = {
      document_hash: documentHash,
      document_id: finalDocumentId,
      user_id: finalUserId,
      user_document_id: userDocumentId,
      document_entity_id: documentEntityId,
      user_email: finalUserEmail,
      anchor_type: 'polygon',
      anchor_status: 'pending',
      polygon_status: 'pending',
      polygon_tx_hash: txHash,
      polygon_error_message: null,
      polygon_attempts: 0,
      polygon_block_number: null,
      polygon_block_hash: null,
      polygon_confirmed_at: null,
      confirmed_at: null,
      metadata: {
        ...(existingAnchor?.metadata ?? {}),
        txHash,
        sponsorAddress,
        network: 'polygon-mainnet',
        submittedAt: new Date().toISOString(),
        ...metadata,
        projectId: projectId || undefined,
        document_entity_id: documentEntityId
      }
    }

    const { data: anchorData, error: anchorError } = existingAnchor
      ? await supabase
        .from('anchors')
        .update(anchorPayload)
        .eq('id', existingAnchor.id)
        .select()
        .single()
      : await supabase
        .from('anchors')
        .upsert(anchorPayload, { onConflict: 'document_hash,anchor_type' })
        .select()
        .single()

    if (anchorError) {
      logger.error('anchor_insert_failed', {
        error: anchorError.message,
        txHash
      })
      return new Response(JSON.stringify({
        error: 'Failed to create anchor record',
        details: anchorError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    logger.info('anchor_created', {
      anchorId: anchorData.id,
      txHash,
      documentEntityId
    })

    const shouldUpdateStatus = !existingAnchor || existingAnchor.anchor_status === 'failed'

    // Update anchor_states for project tracking
    if (projectId && shouldUpdateStatus) {
      const anchorRequestedAt = new Date().toISOString()
      const { error: stateError } = await supabase
        .from('anchor_states')
        .upsert({
          project_id: projectId,
          anchor_requested_at: anchorRequestedAt
        }, { onConflict: 'project_id' })

      if (stateError) {
        logger.warn('anchor_state_upsert_failed', { projectId, error: stateError.message })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      status: 'pending',
      txHash,
      anchorId: anchorData.id,
      message: 'Transaction submitted to Polygon. It will be confirmed in ~30-60 seconds.',
      explorerUrl: `https://polygonscan.com/tx/${txHash}`,
      sponsorAddress
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    logger.error('anchor_polygon_error', {
      error: error instanceof Error ? error.message : String(error)
    })
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
