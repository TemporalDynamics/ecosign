import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'
import { ethers } from 'npm:ethers@6.9.0'
import { appendEvent } from '../_shared/eventHelper.ts'
import { requireInternalAuth } from '../_shared/internalAuth.ts'

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
  const { error } = await supabaseAdmin
    .from('anchors')
    .update({
      anchor_status: 'failed',
      polygon_status: 'failed',
      polygon_attempts: attempts,
      polygon_error_message: message,
      updated_at: new Date().toISOString(),
    })
    .eq('id', anchorId)
  if (error) {
    throw new Error(`markFailed(${anchorId}) failed: ${error.message}`)
  }
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

  const auth = requireInternalAuth(req, { allowCronSecret: true })
  if (!auth.ok) {
    return jsonResponse({ error: 'Forbidden' }, 403)
  }

  if (!supabaseAdmin || !provider) {
    return jsonResponse({ error: 'Supabase or Polygon RPC not configured' }, 500)
  }

  // Heartbeat: mark worker as alive
  try {
    await supabaseAdmin.rpc('worker_heartbeat', { worker_name: 'process-polygon-anchors' })
  } catch (e) {
    console.warn('Failed to update heartbeat:', e)
  }

  try {
    let processed = 0
    let confirmed = 0
    let failed = 0
    let waiting = 0

    const { data: anchors, error } = await supabaseAdmin
      .from('anchors')
      .select('*')
      .eq('anchor_type', 'polygon')
      .or('polygon_status.eq.pending,polygon_status.eq.processing,anchor_status.eq.pending,anchor_status.eq.processing')
      .order('created_at', { ascending: true })
      .limit(25)

    if (error) {
      console.error('Error fetching polygon anchors:', error)
      return jsonResponse({ error: 'Failed to fetch polygon anchors', details: error.message }, 500)
    }

    if (!anchors || anchors.length === 0) {
      return jsonResponse({ success: true, message: 'No polygon anchors to process', processed })
    }

    for (const anchor of anchors) {
      const txHash = anchor.polygon_tx_hash ?? anchor.metadata?.txHash
      const attempts = (anchor.polygon_attempts ?? 0) + 1

      if (!txHash) {
        await markFailed(anchor.id, 'Missing polygon_tx_hash', attempts)
        failed++
        processed++
        continue
      }

      if (attempts > 20) {
        await markFailed(anchor.id, 'Max attempts reached', attempts)
        failed++
        processed++
        continue
      }

      try {
        const receipt = await provider.getTransactionReceipt(txHash)

        if (!receipt) {
          // Still pending in mempool
          const { error: updateProcessingError } = await supabaseAdmin
            .from('anchors')
            .update({
              anchor_status: 'processing',
              polygon_status: 'processing',
              polygon_attempts: attempts,
              updated_at: new Date().toISOString(),
            })
            .eq('id', anchor.id)
          if (updateProcessingError) {
            throw new Error(`Failed to set processing for anchor ${anchor.id}: ${updateProcessingError.message}`)
          }

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

        const { error: updateConfirmedError } = await supabaseAdmin
          .from('anchors')
          .update({
            anchor_status: 'confirmed',
            polygon_status: 'confirmed',
            polygon_tx_hash: txHash,
            polygon_block_number: receipt.blockNumber ?? null,
            polygon_block_hash: receipt.blockHash ?? null,
            polygon_confirmed_at: confirmedAt,
            polygon_attempts: attempts,
            confirmed_at: confirmedAt,
            metadata: updatedMetadata,
          })
          .eq('id', anchor.id)
        if (updateConfirmedError) {
          throw new Error(`Failed to set confirmed for anchor ${anchor.id}: ${updateConfirmedError.message}`)
        }

        // Emit anchor.confirmed event to document_entities.events[] (CANONICAL)
        if (anchor.document_entity_id) {
          // Note: anchor.document_hash IS the witness_hash being anchored
          const witnessHash = anchor.document_hash
          const anchorStage = anchor.metadata?.anchor_stage ?? 'initial'
          const stepIndex = anchor.metadata?.step_index ?? 0
          
          try {
            await appendEvent(supabaseAdmin as any, anchor.document_entity_id, {
              kind: 'anchor.confirmed',
              at: confirmedAt,
              anchor: {
                network: 'polygon',
                witness_hash: witnessHash,
                txid: txHash,
                block_height: receipt.blockNumber ?? null,
                confirmed_at: confirmedAt,
                anchor_stage: anchorStage,
                step_index: stepIndex,
                gas_used: receipt.gasUsed?.toString() ?? null,
                provider: 'polygon',
              }
            }, 'process-polygon-anchors')
            console.log(`✅ Emitted anchor.confirmed for document_entity ${anchor.document_entity_id}`)
          } catch (eventError) {
            console.error(`Failed to emit anchor.confirmed event:`, eventError)
          }
        } else {
          console.warn(`⚠️ No document_entity_id for anchor ${anchor.id}, cannot emit canonical event`)
        }

        await insertNotification(anchor, txHash, receipt.blockNumber, receipt.blockHash, confirmedAt)

        confirmed++
        processed++
      } catch (anchorError) {
        console.error(`Error processing anchor ${anchor.id}:`, anchorError)
        
        // Emit anchor.failed event
        if (anchor.document_entity_id) {
          // Note: anchor.document_hash IS the witness_hash being anchored
          try {
            await appendEvent(supabaseAdmin as any, anchor.document_entity_id, {
              kind: 'anchor.failed',
              at: new Date().toISOString(),
              anchor: {
                network: 'polygon',
                witness_hash: anchor.document_hash,
                reason: anchorError instanceof Error ? anchorError.message : String(anchorError),
                retryable: attempts < 20,
                attempt: attempts,
                provider: 'polygon',
              }
            }, 'process-polygon-anchors')
          } catch (eventError) {
            console.error(`Failed to emit anchor.failed event:`, eventError)
          }
        }
        
        await markFailed(anchor.id, anchorError instanceof Error ? anchorError.message : String(anchorError), attempts)
        failed++
        processed++
      }
    }

    return jsonResponse({
      success: true,
      processed,
      confirmed,
      failed,
      waiting,
      message: `Polygon anchors processed: ${processed} (confirmed ${confirmed}, waiting ${waiting}, failed ${failed})`,
    })
  } catch (err) {
    console.error('process-polygon-anchors fatal error:', err)
    // Mark worker as stalled on fatal error
    try {
      await supabaseAdmin.rpc('worker_heartbeat', { 
        worker_name: 'process-polygon-anchors',
        worker_status: 'stalled'
      })
    } catch (e) {
      console.warn('Failed to update heartbeat:', e)
    }
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
