import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { ethers } from 'https://esm.sh/ethers@6.9.0'

// TODO(canon): support document_entity_id (see docs/EDGE_CANON_MIGRATION_PLAN.md)

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? ''
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  }
}

type AnchorRequest = {
  documentHash: string
  documentId?: string | null
  userDocumentId?: string | null
  userId?: string | null
  userEmail?: string | null
  metadata?: Record<string, unknown>
}

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  const corsHeaders = getCorsHeaders(req)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    const body = await req.json() as AnchorRequest
    const {
      documentHash,
      documentId = null,
      userDocumentId = null,
      userId = null,
      userEmail = null,
      metadata = {}
    } = body

    // P0-1 FIX: Validate documentHash exists and is correct type
    if (!documentHash || typeof documentHash !== 'string') {
      return new Response(JSON.stringify({
        error: 'documentHash is required and must be a string'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const isHex64 = /^[0-9a-f]{64}$/i
    if (!isHex64.test(documentHash.trim())) {
      return new Response(JSON.stringify({
        error: 'Invalid documentHash. Must be 64 hex characters (SHA-256)'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Load config from Supabase Secrets (managed securely via CLI/Dashboard)
    // These secrets are stored encrypted and only accessible to Edge Functions
    const rpcUrl =
      Deno.env.get('POLYGON_RPC_URL') ??
      Deno.env.get('ALCHEMY_RPC_URL')

    const sponsorPrivateKey =
      Deno.env.get('POLYGON_PRIVATE_KEY') ??
      Deno.env.get('SPONSOR_PRIVATE_KEY')

    const contractAddress = Deno.env.get('POLYGON_CONTRACT_ADDRESS')

    if (!rpcUrl || !sponsorPrivateKey || !contractAddress) {
      return new Response(JSON.stringify({
        error: 'Missing Polygon config (POLYGON_RPC_URL, POLYGON_PRIVATE_KEY, POLYGON_CONTRACT_ADDRESS)'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ✅ PRODUCTION: Real blockchain anchoring
    // Connect to Polygon
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const sponsorWallet = new ethers.Wallet(sponsorPrivateKey, provider)
    const sponsorAddress = await sponsorWallet.getAddress()

    // Check balance
    const balance = await provider.getBalance(sponsorAddress)
    if (balance === 0n) {
      return new Response(JSON.stringify({
        error: 'Sponsor wallet has no POL',
        sponsorAddress
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Contract
    const abi = ['function anchorDocument(bytes32 _docHash) external']
    const contract = new ethers.Contract(contractAddress, abi, sponsorWallet)

    // Send transaction
    const hashBytes32 = '0x' + documentHash
    const tx = await contract.anchorDocument(hashBytes32)
    const txHash = tx.hash
    
    console.log('✅ Real transaction submitted to Polygon:', txHash)

    // Save to database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // If userDocumentId is provided but document_id or user_email are missing,
    // fetch them from user_documents to ensure notifications can be sent
    let finalDocumentId = documentId
    let finalUserEmail = userEmail
    let finalUserId = userId
    let projectId: string | null = typeof (metadata as Record<string, unknown>)?.['projectId'] === 'string'
      ? String((metadata as Record<string, unknown>)['projectId'])
      : null

    if (userDocumentId && (!documentId || !userEmail || !projectId || !finalUserId)) {
      const { data: userDoc } = await supabase
        .from('user_documents')
        .select('document_id, user_id, eco_data')
        .eq('id', userDocumentId)
        .single()

      if (userDoc) {
        finalDocumentId = finalDocumentId || userDoc.document_id
        finalUserId = finalUserId || userDoc.user_id
        if (!projectId) {
          const ecoData = userDoc.eco_data as Record<string, unknown> | null
          const manifest = (ecoData?.['manifest'] as Record<string, unknown>) || null
          const manifestProjectId = manifest?.['projectId']
          projectId = typeof manifestProjectId === 'string' ? manifestProjectId : projectId
        }

        // Fetch user email if needed
        if (!userEmail && userDoc.user_id) {
          const { data: userData } = await supabase.auth.admin.getUserById(userDoc.user_id)
          if (userData?.user?.email) {
            finalUserEmail = userData.user.email
          }
        }
      }
    }

    const { data: anchorData, error: anchorError } = await supabase.from('anchors').insert({
      document_hash: documentHash,
      document_id: finalDocumentId,
      user_id: finalUserId,
      user_document_id: userDocumentId,
      user_email: finalUserEmail,
      anchor_type: 'polygon',
      anchor_status: 'pending',
      polygon_status: 'pending',
      polygon_tx_hash: txHash,
      metadata: {
        txHash,
        sponsorAddress,
        network: 'polygon-mainnet',
        submittedAt: new Date().toISOString(),
        ...metadata,
        projectId: projectId || undefined
      }
    }).select().single()

    if (anchorError) {
      console.error('Failed to insert Polygon anchor:', anchorError)
      return new Response(JSON.stringify({
        error: 'Failed to create anchor record',
        details: anchorError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (projectId) {
      const anchorRequestedAt = new Date().toISOString()
      const { error: stateError } = await supabase
        .from('anchor_states')
        .upsert({
          project_id: projectId,
          anchor_requested_at: anchorRequestedAt
        }, { onConflict: 'project_id' })

      if (stateError) {
        console.warn('Failed to upsert anchor_states for Polygon request:', stateError)
      }
    }

    // P0-2 FIX: Update user_documents status when queueing (consistent with Bitcoin)
    if (userDocumentId) {
      const { error: updateError } = await supabase
        .from('user_documents')
        .update({
          overall_status: 'pending_anchor',
          polygon_anchor_id: anchorData.id,
        })
        .eq('id', userDocumentId)

      if (updateError) {
        console.warn('Failed to update user_documents with Polygon anchor status:', updateError)
        // Don't fail the request, anchor is already queued
      } else {
        console.log(`✅ Updated user_documents ${userDocumentId} status to pending_anchor`)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      status: 'pending',
      txHash,
      message: 'Transaction submitted to Polygon. It will be confirmed in ~30-60 seconds.',
      explorerUrl: `https://polygonscan.com/tx/${txHash}`,
      sponsorAddress
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
