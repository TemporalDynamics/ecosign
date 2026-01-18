import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'
import { ethers } from 'npm:ethers@6.9.0'
import { createLogger, withTiming } from '../_shared/logger.ts'
import { shouldRetry, RETRY_CONFIGS, getNextRetryTime } from '../_shared/retry.ts'
import { appendAnchorEventFromEdge, logAnchorAttempt, logAnchorFailed } from '../_shared/anchorHelper.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

// TODO(canon): Migrate from user_document_id to document_entity_id
// Current: Uses user_document_id (legacy), dual-writes to events[]
// Future: Use document_entity_id as primary key

const logger = createLogger('process-polygon-anchors')

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const rpcUrl = Deno.env.get('POLYGON_RPC_URL') ?? Deno.env.get('ALCHEMY_RPC_URL')

const provider = rpcUrl ? new ethers.JsonRpcProvider(rpcUrl) : null
const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

const jsonResponse = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  })

/**
 * Validates cron/admin access via:
 * Authorization header with service role JWT
 */
const requireServiceRole = (req: Request, corsHeaders: Record<string, string>) => {
  const authHeader = req.headers.get('authorization') ?? ''
  const serviceRoleKey = supabaseServiceKey ?? ''
  if (authHeader && serviceRoleKey) {
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (token === serviceRoleKey) {
      return null
    }
  }

  logger.warn('auth_rejected', {
    hasAuthHeader: !!authHeader,
    hasServiceRoleKey: !!serviceRoleKey
  })

  return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders)
}

async function resolveProjectId(anchor: any, userDocumentId?: string | null): Promise<string | null> {
  const fromMetadata = anchor?.metadata?.projectId
  if (typeof fromMetadata === 'string' && fromMetadata.trim()) {
    return fromMetadata
  }
  const resolvedUserDocumentId = userDocumentId ?? anchor?.user_document_id
  if (!supabaseAdmin || !resolvedUserDocumentId) return null
  const { data, error } = await supabaseAdmin
    .from('user_documents')
    .select('eco_data')
    .eq('id', resolvedUserDocumentId)
    .maybeSingle()
  if (error || !data?.eco_data) return null
  const ecoData = data.eco_data as Record<string, unknown>
  const manifest = ecoData?.['manifest'] as Record<string, unknown> | undefined
  const projectId = manifest?.['projectId']
  return typeof projectId === 'string' ? projectId : null
}

/**
 * Resolve document_entity_id from user_document_id (legacy mapping)
 * Returns: { documentEntityId, witnessHash } or null
 */
async function resolveDocumentEntity(userDocumentId: string): Promise<{ documentEntityId: string; witnessHash: string } | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('user_documents')
    .select('document_entity_id')
    .eq('id', userDocumentId)
    .maybeSingle()

  if (error || !data?.document_entity_id) {
    logger.warn('document_entity_not_found', { userDocumentId, error: error?.message })
    return null
  }

  const { data: entity, error: entityError } = await supabaseAdmin
    .from('document_entities')
    .select('id, witness_hash')
    .eq('id', data.document_entity_id)
    .maybeSingle()

  if (entityError || !entity || !entity.witness_hash) {
    logger.warn('witness_hash_not_found', { documentEntityId: data.document_entity_id, error: entityError?.message })
    return null
  }

  return {
    documentEntityId: entity.id,
    witnessHash: entity.witness_hash
  }
}

async function resolveDocumentEntityById(documentEntityId: string): Promise<{ documentEntityId: string; witnessHash: string } | null> {
  if (!supabaseAdmin) return null

  const { data: entity, error } = await supabaseAdmin
    .from('document_entities')
    .select('id, witness_hash')
    .eq('id', documentEntityId)
    .maybeSingle()

  if (error || !entity || !entity.witness_hash) {
    logger.warn('witness_hash_not_found', { documentEntityId, error: error?.message })
    return null
  }

  return {
    documentEntityId: entity.id,
    witnessHash: entity.witness_hash
  }
}

async function resolveUserDocumentIdFromEntity(documentEntityId: string): Promise<string | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('user_documents')
    .select('id')
    .eq('document_entity_id', documentEntityId)
    .maybeSingle()

  if (error || !data?.id) {
    logger.warn('user_document_not_found', { documentEntityId, error: error?.message })
    return null
  }

  return data.id
}

async function markFailed(anchorId: string, message: string, attempts: number, userDocumentId?: string, witnessHash?: string) {
  if (!supabaseAdmin) return

  logger.error('anchor_failed', {
    anchorId,
    attempts,
    reason: message
  })

  // WORKSTREAM 3: Log observable failure event
  if (userDocumentId && witnessHash) {
    await logAnchorFailed(
      supabaseAdmin,
      userDocumentId,
      'polygon',
      witnessHash,
      message,
      attempts,
      { anchorId }
    )
  }

  await supabaseAdmin
    .from('anchors')
    .update({
      anchor_status: 'failed',
      polygon_status: 'failed',
      polygon_attempts: attempts,
      polygon_error_message: message,
      updated_at: new Date().toISOString(),
    })
    .eq('id', anchorId)
}

async function insertNotification(anchor: any, txHash: string, blockNumber?: number | null, blockHash?: string | null, confirmedAt?: string | null) {
  if (!supabaseAdmin) return
  // Require workflow/document context and recipient email to create notification
  if (!anchor.document_id || !anchor.user_email) return

  const explorerUrl = `https://polygonscan.com/tx/${txHash}`
  const subject = '✅ Documento anclado en Polygon'
  const body_html = `
    <p>Tu documento se ancló correctamente en la red Polygon.</p>
    <ul>
      <li><strong>Hash:</strong> <code>${anchor.document_hash}</code></li>
      <li><strong>Tx:</strong> <a href="${explorerUrl}">${txHash}</a></li>
      ${blockNumber ? `<li><strong>Bloque:</strong> ${blockNumber}</li>` : ''}
    </ul>
    <p>Fecha de confirmación: ${confirmedAt ?? 'desconocida'}</p>
  `

  await supabaseAdmin
    .from('workflow_notifications')
    .insert({
      workflow_id: anchor.document_id,
      recipient_email: anchor.user_email,
      recipient_type: 'owner',
      notification_type: 'polygon_confirmed',
      subject,
      body_html,
      delivery_status: 'pending',
      error_message: null,
    })
}

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

  if (!isAllowed) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, corsHeaders)
  }

  const authError = requireServiceRole(req, corsHeaders)
  if (authError) return authError

  if (!supabaseAdmin || !provider) {
    return jsonResponse({ error: 'Supabase or Polygon RPC not configured' }, 500, corsHeaders)
  }

  try {
    logger.info('process_polygon_anchors_started')
    const processingStartTime = Date.now()

    let processed = 0
    let confirmed = 0
    let failed = 0
    let waiting = 0
    let skippedBackoff = 0

    const { data: anchors, error } = await supabaseAdmin
      .from('anchors')
      .select('*')
      .eq('anchor_type', 'polygon')
      .or('polygon_status.eq.pending,polygon_status.eq.processing,anchor_status.eq.pending,anchor_status.eq.processing')
      .order('created_at', { ascending: true })
      .limit(25)

    if (error) {
      logger.error('fetch_anchors_failed', { error: error.message }, error)
      return jsonResponse({ error: 'Failed to fetch polygon anchors', details: error.message }, 500, corsHeaders)
    }

    if (!anchors || anchors.length === 0) {
      logger.info('no_anchors_to_process')
      return jsonResponse({ success: true, message: 'No polygon anchors to process', processed }, 200, corsHeaders)
    }

    logger.info('anchors_fetched', { count: anchors.length })

    for (const anchor of anchors) {
      const txHash = anchor.polygon_tx_hash ?? anchor.metadata?.txHash
      const attempts = (anchor.polygon_attempts ?? 0) + 1
      const anchorDocumentEntityId = anchor.document_entity_id
        ?? anchor.metadata?.document_entity_id
        ?? null
      const resolvedUserDocumentId = anchor.user_document_id
        ?? (anchorDocumentEntityId ? await resolveUserDocumentIdFromEntity(anchorDocumentEntityId) : null)

      // Resolve document entity for observable events
      const docEntity = anchorDocumentEntityId
        ? await resolveDocumentEntityById(anchorDocumentEntityId)
        : (resolvedUserDocumentId ? await resolveDocumentEntity(resolvedUserDocumentId) : null)

      if (!txHash) {
        await markFailed(
          anchor.id,
          'Missing polygon_tx_hash',
          attempts,
          resolvedUserDocumentId ?? undefined,
          docEntity?.witnessHash
        )
        failed++
        processed++
        continue
      }

      // WORKSTREAM 3: Log attempt (observability event)
      // This creates audit trail of ALL attempts (including retries)
      // Philosophy: "UI refleja, no afirma" - every attempt is logged
      if (resolvedUserDocumentId && docEntity?.witnessHash) {
        await logAnchorAttempt(
          supabaseAdmin,
          resolvedUserDocumentId,
          'polygon',
          docEntity.witnessHash,
          {
            txHash,
            anchorId: anchor.id,
            attempts
          }
        )
      }

      // P1-1 FIX: Exponential backoff - skip if not enough time has passed
      if (!shouldRetry(anchor.updated_at, attempts, RETRY_CONFIGS.polygon)) {
        const { nextRetryAt, waitTimeMs } = getNextRetryTime(
          anchor.updated_at,
          attempts,
          RETRY_CONFIGS.polygon
        )
        
        logger.debug('anchor_backoff_skip', {
          anchorId: anchor.id,
          attempts,
          nextRetryAt: nextRetryAt.toISOString(),
          waitTimeMs
        })
        
        skippedBackoff++
        continue
      }

      if (attempts > RETRY_CONFIGS.polygon.maxAttempts) {
        await markFailed(
          anchor.id,
          'Max attempts reached',
          attempts,
          resolvedUserDocumentId ?? undefined,
          docEntity?.witnessHash
        )
        failed++
        processed++
        continue
      }

      try {
        const { result: receipt, durationMs } = await withTiming(() =>
          provider.getTransactionReceipt(txHash)
        )

        logger.debug('receipt_fetched', {
          anchorId: anchor.id,
          txHash,
          durationMs,
          hasReceipt: !!receipt
        })

        if (!receipt) {
          // Still pending in mempool
          logger.info('anchor_still_pending', {
            anchorId: anchor.id,
            txHash,
            attempts
          })

          await supabaseAdmin
            .from('anchors')
            .update({
              anchor_status: 'processing',
              polygon_status: 'processing',
              polygon_attempts: attempts,
              updated_at: new Date().toISOString(),
            })
            .eq('id', anchor.id)

          waiting++
          processed++
          continue
        }

        if (receipt.status !== 1) {
          await markFailed(
            anchor.id,
            `Receipt status ${receipt.status}`,
            attempts,
            resolvedUserDocumentId ?? undefined,
            docEntity?.witnessHash
          )
          failed++
          processed++
          continue
        }

        const block = receipt.blockNumber ? await provider.getBlock(receipt.blockNumber) : null
        const confirmedAt = block?.timestamp
          ? new Date(block.timestamp * 1000).toISOString()
          : new Date().toISOString()

        const updatedMetadata = {
          ...anchor.metadata,
          txHash,
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          gasUsed: receipt.gasUsed?.toString?.(),
          cumulativeGasUsed: receipt.cumulativeGasUsed?.toString?.(),
          effectiveGasPrice: (receipt as any).effectiveGasPrice?.toString?.(),
          confirmedAt,
        }

        // P0-3 FIX: Use atomic transaction to update anchors + user_documents together
        const userDocumentUpdates = resolvedUserDocumentId ? {
          document_id: resolvedUserDocumentId,
          has_polygon_anchor: true,
          polygon_anchor_id: anchor.id,
          overall_status: 'certified',
          download_enabled: true,
        } : null

        const { error: atomicError } = await supabaseAdmin.rpc('anchor_polygon_atomic_tx', {
          _anchor_id: anchor.id,
          _anchor_user_id: anchor.user_id,
          _tx_hash: txHash,
          _block_number: receipt.blockNumber ?? null,
          _block_hash: receipt.blockHash ?? null,
          _confirmed_at: confirmedAt,
          _metadata: updatedMetadata,
          _user_document_updates: userDocumentUpdates,
          _polygon_attempts: attempts
        })

        if (atomicError) {
          logger.error('atomic_transaction_failed', {
            anchorId: anchor.id,
            txHash,
            error: atomicError.message
          }, atomicError)
          failed++
          processed++
          continue
        }

        // ✅ CANONICAL INTEGRATION: Append anchor event to document_entities.events[]
        // This dual-writes to both legacy tables (above) and canonical events[] (below)
        if (docEntity) {
          const appendResult = await appendAnchorEventFromEdge(
            supabaseAdmin,
            docEntity.documentEntityId,
            {
              network: 'polygon',
              witness_hash: docEntity.witnessHash,
              txid: txHash,
              block_height: receipt.blockNumber ?? undefined,
              confirmed_at: confirmedAt
            }
          )

          if (appendResult.success) {
            logger.info('anchor_event_appended', {
              anchorId: anchor.id,
              documentEntityId: docEntity.documentEntityId,
              network: 'polygon',
              txHash
            })
          } else {
            // Non-critical: legacy tables are already updated
            logger.warn('anchor_event_append_failed', {
              anchorId: anchor.id,
              documentEntityId: docEntity.documentEntityId,
              error: appendResult.error
            })
          }
        } else {
          logger.warn('document_entity_not_resolved', {
            anchorId: anchor.id,
            userDocumentId: resolvedUserDocumentId,
            documentEntityId: anchorDocumentEntityId
          })
        }

        const projectId = await resolveProjectId(anchor, resolvedUserDocumentId)
        if (projectId) {
          const anchorRequestedAt = anchor.created_at || new Date().toISOString()
          const { error: stateError } = await supabaseAdmin
            .from('anchor_states')
            .upsert({
              project_id: projectId,
              anchor_requested_at: anchorRequestedAt,
              polygon_confirmed_at: confirmedAt
            }, { onConflict: 'project_id' })

          if (stateError) {
            logger.warn('anchor_state_upsert_failed', {
              anchorId: anchor.id,
              projectId,
              error: stateError.message
            })
          }
        }

        logger.info('anchor_confirmed', {
          anchorId: anchor.id,
          txHash,
          blockNumber: receipt.blockNumber,
          confirmedAt,
          attempts,
          documentId: resolvedUserDocumentId
        })

        // ❌ DEPRECATED: upgrade_protection_level removed (P0.2)
        // Reason: Protection level is DERIVED from events[], not stored state
        // UI already derives correctly via deriveProtectionLevel(events)
        // Persisting levels violates canonical contract: "level is pure function"
        // Contract: docs/contratos/PROTECTION_LEVEL_RULES.md
        // Migration: 20260106150000_deprecate_upgrade_protection_level.sql

        await insertNotification(anchor, txHash, receipt.blockNumber, receipt.blockHash, confirmedAt)

        confirmed++
        processed++
      } catch (anchorError) {
        logger.error('anchor_processing_error', {
          anchorId: anchor.id,
          txHash,
          attempts
        }, anchorError instanceof Error ? anchorError : new Error(String(anchorError)))

        await markFailed(
          anchor.id,
          anchorError instanceof Error ? anchorError.message : String(anchorError),
          attempts,
          resolvedUserDocumentId ?? undefined,
          docEntity?.witnessHash
        )
        failed++
        processed++
      }
    }

    const totalDurationMs = Date.now() - processingStartTime

    logger.info('process_polygon_anchors_completed', {
      processed,
      confirmed,
      failed,
      waiting,
      skippedBackoff,
      durationMs: totalDurationMs
    })

    return jsonResponse({
      success: true,
      processed,
      confirmed,
      failed,
      waiting,
      skippedBackoff,
      durationMs: totalDurationMs,
      message: `Polygon anchors processed: ${processed} (confirmed ${confirmed}, waiting ${waiting}, failed ${failed}, skipped ${skippedBackoff})`,
    }, 200, corsHeaders)
  } catch (err) {
    logger.error('process_polygon_anchors_fatal', {}, err instanceof Error ? err : new Error(String(err)))
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500, corsHeaders)
  }
})
