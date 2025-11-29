import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'
import { ethers } from 'npm:ethers@6.9.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { documentHash } = await req.json()

    if (!documentHash || !/^[a-f0-9]{64}$/i.test(documentHash)) {
      return new Response(JSON.stringify({
        error: 'Invalid documentHash. Must be 64 hex characters'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Load config (accept both legacy and new env names)
    const rpcUrl =
      Deno.env.get('POLYGON_RPC_URL') ??
      Deno.env.get('ALCHEMY_RPC_URL')
    const sponsorPrivateKey =
      Deno.env.get('POLYGON_PRIVATE_KEY') ??
      Deno.env.get('SPONSOR_PRIVATE_KEY')
    const contractAddress = Deno.env.get('POLYGON_CONTRACT_ADDRESS')

    if (!rpcUrl || !sponsorPrivateKey || !contractAddress) {
      return new Response(JSON.stringify({
        error: 'Missing Polygon config (POLYGON_RPC_URL/ALCHEMY_RPC_URL, POLYGON_PRIVATE_KEY/SPONSOR_PRIVATE_KEY, POLYGON_CONTRACT_ADDRESS)'
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

    console.log('TX sent:', tx.hash)

    // Return immediately without waiting for confirmation
    // The transaction will be mined in the background
    // We'll save it as 'pending' and update later
    const txHash = tx.hash

    // Save to database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await supabase.from('anchors').insert({
      document_hash: documentHash,
      anchor_type: 'polygon',
      anchor_status: 'pending',
      metadata: {
        txHash,
        sponsorAddress,
        network: 'polygon-mainnet',
        submittedAt: new Date().toISOString()
      }
    })

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
