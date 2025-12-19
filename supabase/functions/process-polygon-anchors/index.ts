import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'
import { ethers } from 'npm:ethers@6.9.0'
import { createLogger, withTiming } from '../_shared/logger.ts'
import { shouldRetry, RETRY_CONFIGS, getNextRetryTime } from '../_shared/retry.ts'

const logger = createLogger('process-polygon-anchors')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const rpcUrl = Deno.env.get('POLYGON_RPC_URL') ?? Deno.env.get('ALCHEMY_RPC_URL')

const provider = rpcUrl ? new ethers.JsonRpcProvider(rpcUrl) : null
const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

async function markFailed(anchorId: string, message: string, attempts: number) {
  if (!supabaseAdmin) return
  
  logger.error('anchor_failed', {
    anchorId,
    attempts,
    reason: message
  })
  
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!supabaseAdmin || !provider) {
    return jsonResponse({ error: 'Supabase or Polygon RPC not configured' }, 500)
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
      return jsonResponse({ error: 'Failed to fetch polygon anchors', details: error.message }, 500)
    }

    if (!anchors || anchors.length === 0) {
      logger.info('no_anchors_to_process')
      return jsonResponse({ success: true, message: 'No polygon anchors to process', processed })
    }

    logger.info('anchors_fetched', { count: anchors.length })

    for (const anchor of anchors) {
      const txHash = anchor.polygon_tx_hash ?? anchor.metadata?.txHash
      const attempts = (anchor.polygon_attempts ?? 0) + 1

      if (!txHash) {
        await markFailed(anchor.id, 'Missing polygon_tx_hash', attempts)
        failed++
        processed++
        continue
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
        await markFailed(anchor.id, 'Max attempts reached', attempts)
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
          await markFailed(anchor.id, `Receipt status ${receipt.status}`, attempts)
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
        const userDocumentUpdates = anchor.user_document_id ? {
          document_id: anchor.user_document_id,
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

        logger.info('anchor_confirmed', {
          anchorId: anchor.id,
          txHash,
          blockNumber: receipt.blockNumber,
          confirmedAt,
          attempts,
          documentId: anchor.user_document_id
        })

        // ✅ UPGRADE PROTECTION LEVEL (monotonic increase)
        if (anchor.user_document_id) {
          try {
            await supabaseAdmin.rpc('upgrade_protection_level', {
              doc_id: anchor.user_document_id
            })
            logger.info('protection_level_upgraded', {
              documentId: anchor.user_document_id,
              anchorId: anchor.id
            })
          } catch (upgradeError) {
            logger.error('upgrade_protection_level_failed', {
              documentId: anchor.user_document_id,
              anchorId: anchor.id
            }, upgradeError instanceof Error ? upgradeError : new Error(String(upgradeError)))
            // Don't fail the whole process if upgrade fails
          }
        }

        await insertNotification(anchor, txHash, receipt.blockNumber, receipt.blockHash, confirmedAt)

        confirmed++
        processed++
      } catch (anchorError) {
        logger.error('anchor_processing_error', {
          anchorId: anchor.id,
          txHash,
          attempts
        }, anchorError instanceof Error ? anchorError : new Error(String(anchorError)))
        
        await markFailed(anchor.id, anchorError instanceof Error ? anchorError.message : String(anchorError), attempts)
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
    })
  } catch (err) {
    logger.error('process_polygon_anchors_fatal', {}, err instanceof Error ? err : new Error(String(err)))
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
