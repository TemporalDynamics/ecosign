import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })

interface Payload {
  accessToken: string
  signedPdfBase64: string
  signedPdfHash: string
  encryptionKey: string
  signatureDataUrl: string
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = (await req.json()) as Payload
    const { accessToken, signedPdfBase64, signedPdfHash, encryptionKey, signatureDataUrl } = body

    if (!accessToken || !signedPdfBase64 || !signedPdfHash || !encryptionKey) {
      return json({ error: 'Missing required fields' }, 400)
    }

    const tokenHash = /^[a-f0-9]{64}$/i.test(accessToken)
      ? accessToken
      : await hashToken(accessToken)

    const { data: signer, error: signerError } = await supabase
      .from('workflow_signers')
      .select('id, workflow_id, status')
      .eq('access_token_hash', tokenHash)
      .single()

    if (signerError || !signer) {
      return json({ error: 'Invalid or expired access token' }, 404)
    }

    if (signer.status !== 'ready_to_sign') {
      return json({ error: 'Not allowed to sign at this time' }, 403)
    }

    const binary = Uint8Array.from(atob(signedPdfBase64), (c) => c.charCodeAt(0))
    const signedPath = `signed/${signer.workflow_id}/${signer.id}/${Date.now()}.pdf.enc`

    const { error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(signedPath, binary, {
        contentType: 'application/octet-stream',
        upsert: false
      })

    if (uploadError) {
      return json({ error: 'No se pudo subir el documento firmado', details: uploadError.message }, 500)
    }

    const { error: workflowUpdateError } = await supabase
      .from('signature_workflows')
      .update({
        document_path: signedPath,
        document_hash: signedPdfHash,
        encryption_key: encryptionKey
      })
      .eq('id', signer.workflow_id)

    if (workflowUpdateError) {
      return json({ error: 'No se pudo actualizar el flujo', details: workflowUpdateError.message }, 500)
    }

    const { error: signerUpdateError } = await supabase
      .from('workflow_signers')
      .update({
        status: 'signed',
        signature_data: signatureDataUrl,
        signed_at: new Date().toISOString()
      })
      .eq('id', signer.id)

    if (signerUpdateError) {
      return json({ error: 'No se pudo actualizar el firmante', details: signerUpdateError.message }, 500)
    }

    return json({ success: true, document_path: signedPath })
  } catch (error: any) {
    console.error('store-signer-signature error', error)
    return json({ error: error?.message || 'Unexpected error' }, 500)
  }
})
