import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'
import { ethers } from 'npm:ethers@6.9.0'

type AnchorRequest = {
  documentHash: string
  documentId?: string | null
  userId?: string | null
  userEmail?: string | null
  metadata?: Record<string, unknown>
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
}

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })

// Smart contract ABI para el método de anclaje
// Solo necesitamos la función que registra el hash
const ANCHOR_CONTRACT_ABI = [
  'function anchorHash(bytes32 hash) external returns (uint256)',
  'function getAnchor(bytes32 hash) external view returns (uint256, address)',
  'event HashAnchored(bytes32 indexed hash, address indexed anchorer, uint256 timestamp)'
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Configuración de Polygon (desde env vars)
    const polygonRpcUrl = Deno.env.get('POLYGON_RPC_URL') // Tu URL de Alchemy
    const privateKey = Deno.env.get('POLYGON_PRIVATE_KEY') // Tu private key de Metamask
    const contractAddress = Deno.env.get('POLYGON_CONTRACT_ADDRESS') // Dirección del contrato

    if (!polygonRpcUrl || !privateKey || !contractAddress) {
      console.error('Missing Polygon configuration')
      return jsonResponse({
        error: 'Polygon anchoring not configured. Contact support.',
        details: 'Missing RPC_URL, PRIVATE_KEY, or CONTRACT_ADDRESS'
      }, 503)
    }

    // Parse request
    const body = await req.json() as AnchorRequest
    const { documentHash, documentId = null, userId = null, userEmail = null, metadata = {} } = body

    if (!documentHash || typeof documentHash !== 'string') {
      return jsonResponse({ error: 'documentHash is required' }, 400)
    }

    // Validar formato de hash (debe ser SHA-256 hex)
    if (!/^[a-f0-9]{64}$/i.test(documentHash)) {
      return jsonResponse({ error: 'Invalid hash format. Must be SHA-256 hex string' }, 400)
    }

    console.log(`Starting Polygon anchor for hash: ${documentHash}`)

    // Guardar solicitud en DB primero (estado: queued)
    const { data: anchorRecord, error: dbError } = await supabase
      .from('anchors')
      .insert({
        document_hash: documentHash,
        document_id: documentId,
        user_id: userId,
        user_email: userEmail,
        anchor_type: 'polygon',
        anchor_status: 'queued',
        metadata: {
          ...metadata,
          requestedAt: new Date().toISOString(),
          source: metadata?.['source'] || 'client',
          network: 'polygon-mainnet'
        }
      })
      .select()
      .single()

    if (dbError || !anchorRecord) {
      console.error('Failed to create anchor record:', dbError)
      return jsonResponse({ error: 'Failed to create anchor request' }, 500)
    }

    // Conectar a Polygon Mainnet
    const provider = new ethers.JsonRpcProvider(polygonRpcUrl)
    const wallet = new ethers.Wallet(privateKey, provider)
    const contract = new ethers.Contract(contractAddress, ANCHOR_CONTRACT_ABI, wallet)

    // Convertir hash a bytes32 para el contrato
    const hashBytes32 = '0x' + documentHash

    // Actualizar estado a 'processing'
    await supabase
      .from('anchors')
      .update({ anchor_status: 'processing' })
      .eq('id', anchorRecord.id)

    console.log(`Sending transaction to Polygon for anchor ${anchorRecord.id}`)

    // Enviar transacción al smart contract
    const tx = await contract.anchorHash(hashBytes32)

    console.log(`Transaction sent: ${tx.hash}`)

    // Actualizar con hash de transacción
    await supabase
      .from('anchors')
      .update({
        anchor_status: 'pending',
        metadata: {
          ...anchorRecord.metadata,
          txHash: tx.hash,
          txSentAt: new Date().toISOString()
        }
      })
      .eq('id', anchorRecord.id)

    // Esperar confirmación (timeout: 2 minutos)
    let receipt
    try {
      receipt = await tx.wait(1) // Esperar 1 confirmación
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`)
    } catch (waitError) {
      console.error('Transaction wait timeout:', waitError)
      // No falla - se procesará después
      return jsonResponse({
        anchorId: anchorRecord.id,
        status: 'pending',
        txHash: tx.hash,
        message: 'Transaction sent to Polygon. Confirmation pending.',
        estimatedTime: '1-5 minutes',
        explorerUrl: `https://polygonscan.com/tx/${tx.hash}`,
        willNotify: Boolean(userEmail)
      })
    }

    // Transacción confirmada
    const confirmedAt = new Date().toISOString()

    await supabase
      .from('anchors')
      .update({
        anchor_status: 'confirmed',
        confirmed_at: confirmedAt,
        metadata: {
          ...anchorRecord.metadata,
          txHash: tx.hash,
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          gasUsed: receipt.gasUsed.toString(),
          confirmedAt
        }
      })
      .eq('id', anchorRecord.id)

    // TODO: Enviar notificación por email si userEmail existe
    if (userEmail) {
      console.log(`Should send notification to ${userEmail}`)
      // Implementar con Resend o similar
    }

    return jsonResponse({
      anchorId: anchorRecord.id,
      status: 'confirmed',
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      timestamp: confirmedAt,
      message: 'Hash successfully anchored on Polygon Mainnet',
      explorerUrl: `https://polygonscan.com/tx/${tx.hash}`,
      proof: {
        network: 'polygon-mainnet',
        contractAddress,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        timestamp: confirmedAt
      }
    })

  } catch (error) {
    console.error('Error in anchor-polygon:', error)

    // Intentar marcar como failed en DB
    const bodyParsed = await req.clone().json().catch(() => ({})) as AnchorRequest
    if (bodyParsed?.documentHash) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        await supabase
          .from('anchors')
          .update({
            anchor_status: 'failed',
            metadata: {
              error: error instanceof Error ? error.message : String(error),
              failedAt: new Date().toISOString()
            }
          })
          .eq('document_hash', bodyParsed.documentHash)
          .eq('anchor_type', 'polygon')
          .eq('anchor_status', 'processing')
      } catch {
        // Ignore cleanup errors
      }
    }

    return jsonResponse({
      error: error instanceof Error ? error.message : 'Internal server error',
      details: error instanceof Error ? error.stack : undefined
    }, 500)
  }
})
